import { Order, OrderStatus, AdminStats } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_SAMPLE_ORDERS } from '../lib/seedData';
import { generateOrderNumber } from '../lib/upiUtils';
import { productService } from './productService';

const ORDERS_STORAGE_KEY = 'printlab_orders_data_v1';

function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_ORDERS));
      return INITIAL_SAMPLE_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SAMPLE_ORDERS;
  }
}

function saveLocalOrders(orders: Order[]): void {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

export const orderService = {
  async getAll(): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            product:products(*),
            customer:customers(*),
            payment:payments(*)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data && data.length > 0) return data as Order[];
      } catch (err) {
        console.warn('Supabase orders fetch error, falling back to local:', err);
      }
    }
    return getLocalOrders();
  },

  async getById(idOrOrderNumber: string): Promise<Order | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            product:products(*),
            customer:customers(*),
            payment:payments(*)
          `)
          .or(`id.eq.${idOrOrderNumber},order_number.eq.${idOrOrderNumber}`)
          .maybeSingle();

        if (error) throw error;
        if (data) return data as Order;
      } catch (err) {
        console.warn('Supabase single order fetch failed:', err);
      }
    }

    const all = getLocalOrders();
    return all.find((o) => o.id === idOrOrderNumber || o.order_number.toUpperCase() === idOrOrderNumber.toUpperCase()) || null;
  },

  async getByCustomerId(customerId: string): Promise<Order[]> {
    const all = await this.getAll();
    return all.filter((o) => o.customer_id === customerId || o.customer?.id === customerId);
  },

  async create(orderPayload: {
    customer_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    customization?: Order['customization'];
    customer?: Order['customer'];
    product?: Order['product'];
  }): Promise<Order> {
    const orderNumber = generateOrderNumber();
    const sessionCreatedAt = new Date().toISOString();
    // 10-minute payment session window
    const sessionExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      order_number: orderNumber,
      customer_id: orderPayload.customer_id,
      product_id: orderPayload.product_id,
      quantity: orderPayload.quantity,
      unit_price: orderPayload.unit_price,
      total_amount: orderPayload.total_amount,
      customization: orderPayload.customization,
      order_status: 'PENDING_PAYMENT',
      payment_session_created_at: sessionCreatedAt,
      payment_session_expires_at: sessionExpiresAt,
      created_at: sessionCreatedAt,
      updated_at: sessionCreatedAt,
      customer: orderPayload.customer,
      product: orderPayload.product,
      payment: {
        id: 'pay-' + Date.now(),
        order_id: 'ord-' + Date.now(),
        amount: orderPayload.total_amount,
        payment_status: 'PENDING',
        created_at: sessionCreatedAt,
        updated_at: sessionCreatedAt,
      },
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .insert([{
            order_number: orderNumber,
            customer_id: orderPayload.customer_id,
            product_id: orderPayload.product_id,
            quantity: orderPayload.quantity,
            unit_price: orderPayload.unit_price,
            total_amount: orderPayload.total_amount,
            customization: orderPayload.customization,
            order_status: 'PENDING_PAYMENT',
            payment_session_created_at: sessionCreatedAt,
            payment_session_expires_at: sessionExpiresAt,
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          newOrder.id = data.id;
          newOrder.order_number = data.order_number;
          // also initialize payment row
          await supabase.from('payments').insert([{
            order_id: data.id,
            amount: orderPayload.total_amount,
            payment_status: 'PENDING',
          }]);
        }
      } catch (err) {
        console.warn('Supabase order insert error, saving locally:', err);
      }
    }

    const current = getLocalOrders();
    const updated = [newOrder, ...current];
    saveLocalOrders(updated);
    return newOrder;
  },

  async createOrder(orderPayload: {
    customer_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    customization?: Order['customization'];
    product?: Order['product'];
  }): Promise<Order> {
    return this.create(orderPayload);
  },

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({ order_status: status, updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .select()
          .single();

        if (error) throw error;
      } catch (err) {
        console.warn('Supabase status update failed:', err);
      }
    }

    const current = getLocalOrders();
    const index = current.findIndex((o) => o.id === orderId);
    if (index === -1) throw new Error('Order not found');

    current[index] = {
      ...current[index],
      order_status: status,
      updated_at: new Date().toISOString(),
    };
    saveLocalOrders(current);
    return current[index];
  },

  /**
   * Ensures an order has a valid 10-minute payment session and evaluates expiration
   */
  async ensurePaymentSession(orderId: string): Promise<Order | null> {
    const order = await this.getById(orderId);
    if (!order) return null;

    let modified = false;
    let currentOrder = { ...order };

    // Initialize session if not present
    if (!currentOrder.payment_session_expires_at) {
      const createdAt = currentOrder.created_at || new Date().toISOString();
      const expiresAt = new Date(new Date(createdAt).getTime() + 10 * 60 * 1000).toISOString();
      currentOrder.payment_session_created_at = createdAt;
      currentOrder.payment_session_expires_at = expiresAt;
      modified = true;
    }

    // Check if session has expired
    const expiresAtTime = new Date(currentOrder.payment_session_expires_at).getTime();
    if (
      Date.now() >= expiresAtTime &&
      (currentOrder.order_status === 'PENDING_PAYMENT' || currentOrder.order_status === 'ORDER_PLACED')
    ) {
      currentOrder.order_status = 'PAYMENT_EXPIRED';
      modified = true;
    }

    if (modified) {
      const current = getLocalOrders();
      const index = current.findIndex((o) => o.id === currentOrder.id || o.order_number === currentOrder.order_number);
      if (index !== -1) {
        current[index] = {
          ...current[index],
          ...currentOrder,
          updated_at: new Date().toISOString(),
        };
        saveLocalOrders(current);
      }

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('orders')
            .update({
              order_status: currentOrder.order_status,
              payment_session_created_at: currentOrder.payment_session_created_at,
              payment_session_expires_at: currentOrder.payment_session_expires_at,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentOrder.id);
        } catch (err) {
          console.warn('Supabase session sync error:', err);
        }
      }
    }

    return currentOrder;
  },

  /**
   * Immediately expires the payment session and cancels order payment window
   */
  async expirePaymentSession(orderId: string): Promise<Order> {
    return this.updateStatus(orderId, 'PAYMENT_EXPIRED');
  },

  async getAdminStats(): Promise<AdminStats> {
    const [allProducts, allOrders] = await Promise.all([
      productService.getAll(),
      this.getAll(),
    ]);

    const totalProducts = allProducts.length;
    const availableProducts = allProducts.filter((p) => p.is_available).length;
    const totalOrders = allOrders.length;
    const pendingPaymentVerification = allOrders.filter(
      (o) => o.order_status === 'PENDING_PAYMENT_VERIFICATION' || (o.payment?.payment_status === 'SUBMITTED' && o.order_status === 'PENDING_PAYMENT')
    ).length;
    const verifiedOrders = allOrders.filter((o) => o.order_status === 'PAYMENT_VERIFIED').length;
    const printingOrders = allOrders.filter((o) => o.order_status === 'PRINTING').length;
    const readyOrders = allOrders.filter((o) => o.order_status === 'READY_FOR_PICKUP').length;
    const completedOrders = allOrders.filter((o) => o.order_status === 'COMPLETED').length;

    // Calculate total revenue from verified / printing / completed orders
    const totalRevenue = allOrders
      .filter((o) => ['PAYMENT_VERIFIED', 'PRINTING', 'READY_FOR_PICKUP', 'COMPLETED'].includes(o.order_status))
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    return {
      totalProducts,
      availableProducts,
      totalOrders,
      pendingPaymentVerification,
      verifiedOrders,
      printingOrders,
      readyOrders,
      completedOrders,
      totalRevenue,
    };
  },

  async searchOrders(query: string): Promise<Order[]> {
    const all = await this.getAll();
    const q = query.toLowerCase().trim();
    return all.filter((o) => {
      const matchNum = o.order_number.toLowerCase().includes(q);
      const matchPhone = o.customer?.phone.toLowerCase().includes(q) || false;
      const matchName = o.customer?.name.toLowerCase().includes(q) || false;
      const matchTx = o.payment?.transaction_id?.toLowerCase().includes(q) || false;
      return matchNum || matchPhone || matchName || matchTx;
    });
  }
};

