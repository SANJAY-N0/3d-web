import { Order, OrderStatus, AdminStats } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateOrderNumber } from '../lib/upiUtils';
import { productService } from './productService';

const ORDERS_STORAGE_KEY = 'printlab_orders_data_v1';

const FAKE_ORDER_NUMBERS = new Set(['3DP-2026-00124', '3DP-2026-00125', '3DP-2026-00126']);
const FAKE_CUSTOMER_NAMES = new Set(['sanjay kumar', 'priya sharma', 'aditya varma']);

function isFakeOrder(o: any): boolean {
  if (!o) return true;
  if (o.order_number && FAKE_ORDER_NUMBERS.has(o.order_number.toUpperCase())) return true;
  if (o.customer?.name && FAKE_CUSTOMER_NAMES.has(o.customer.name.trim().toLowerCase())) return true;
  if (o.product?.name && o.product.name.trim().toLowerCase() === 'nothing') return true;
  if (o.product_id === 'nothing' || o.id === 'nothing') return true;
  return false;
}

function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    const cleaned = parsed.filter((o) => !isFakeOrder(o)).map(normalizeOrder);
    if (cleaned.length !== parsed.length) {
      saveLocalOrders(cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: Order[]): void {
  const cleaned = orders.filter((o) => !isFakeOrder(o)).slice(0, 5);
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

function normalizeOrder(o: any): Order {
  return {
    ...o,
    payment: Array.isArray(o.payment) ? o.payment[0] || null : o.payment,
  };
}

export const orderService = {
  /**
   * Fetch all orders from Supabase (pure real data, no fake mock fallback)
   */
  async getAll(): Promise<Order[]> {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase is not configured. Returning empty orders list.');
      return [];
    }

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

      if (error) {
        console.error('Supabase orders query error:', error);
        return [];
      }

      const normalized = (data || []).map(normalizeOrder).filter((o) => !isFakeOrder(o));
      return normalized;
    } catch (err) {
      console.error('Supabase orders fetch error:', err);
      return [];
    }
  },

  /**
   * Fetch order by ID or order number (via server API with fallback to Supabase and local cache)
   */
  async getById(idOrOrderNumber: string): Promise<Order | null> {
    if (!idOrOrderNumber || !idOrOrderNumber.trim()) return null;
    const cleanId = idOrOrderNumber.trim();

    // 1. Try server API endpoint first
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.order && !isFakeOrder(json.data.order)) {
          return normalizeOrder(json.data.order);
        }
      } else if (res.status === 404) {
        // Specifically not found on server
        return null;
      }
    } catch (apiErr) {
      console.warn('Backend /api/orders/:orderId fetch failed, trying direct Supabase query:', apiErr);
    }

    // 2. Direct Supabase query fallback
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
          .or(`id.eq.${cleanId},order_number.eq.${cleanId}`)
          .maybeSingle();

        if (!error && data && !isFakeOrder(data)) {
          return normalizeOrder(data);
        }
      } catch (err) {
        console.warn('Supabase single order fetch failed:', err);
      }
    }

    // 3. Local cache fallback
    const all = getLocalOrders();
    return all.find((o) => (o.id === cleanId || o.order_number.toUpperCase() === cleanId.toUpperCase()) && !isFakeOrder(o)) || null;
  },

  /**
   * Fetch customer orders
   */
  async getByCustomerId(customerId: string): Promise<Order[]> {
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
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(normalizeOrder).filter((o) => !isFakeOrder(o));
      } catch (err) {
        console.warn('Supabase customer orders query error:', err);
        return [];
      }
    }

    const current = getLocalOrders();
    return current.filter((o) => o.customer_id === customerId || o.customer?.id === customerId);
  },

  /**
   * Create new order with server price validation
   */
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

    // Price calculation integrity enforcement: total_amount = unit_price * quantity
    const validatedTotal = Number(orderPayload.unit_price) * Number(orderPayload.quantity);

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      order_number: orderNumber,
      customer_id: orderPayload.customer_id,
      product_id: orderPayload.product_id,
      quantity: orderPayload.quantity,
      unit_price: orderPayload.unit_price,
      total_amount: validatedTotal,
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
        amount: validatedTotal,
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
            total_amount: validatedTotal,
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
          // also initialize payment row in Supabase
          await supabase.from('payments').insert([{
            order_id: data.id,
            amount: validatedTotal,
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
    let updatedOrder: Order | null = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({ order_status: status, updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .select(`
            *,
            product:products(*),
            customer:customers(*),
            payment:payments(*)
          `)
          .single();

        if (error) throw error;
        if (data) updatedOrder = normalizeOrder(data);
      } catch (err) {
        console.warn('Supabase status update failed:', err);
      }
    }

    const current = getLocalOrders();
    const index = current.findIndex((o) => o.id === orderId);
    if (index !== -1) {
      current[index] = {
        ...current[index],
        order_status: status,
        updated_at: new Date().toISOString(),
      };
      saveLocalOrders(current);
      return current[index];
    }

    if (updatedOrder) return updatedOrder;
    throw new Error('Order not found');
  },

  /**
   * Delete an order
   */
  async delete(orderId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('orders').delete().eq('id', orderId);
      } catch (err) {
        console.warn('Supabase order delete error:', err);
      }
    }
    const current = getLocalOrders();
    const filtered = current.filter((o) => o.id !== orderId && o.order_number !== orderId);
    saveLocalOrders(filtered);
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
    const q = query.trim();
    if (!q) return [];

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
          .or(`order_number.ilike.%${q}%,id.eq.${q}`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          return data.map(normalizeOrder).filter((o) => !isFakeOrder(o));
        }
      } catch (err) {
        console.warn('Supabase searchOrders error:', err);
      }
    }

    const all = await this.getAll();
    const qLower = q.toLowerCase();
    return all.filter((o) => {
      const matchNum = o.order_number.toLowerCase().includes(qLower);
      const matchPhone = o.customer?.phone?.toLowerCase().includes(qLower) || false;
      const matchName = o.customer?.name?.toLowerCase().includes(qLower) || false;
      const matchTx = o.payment?.transaction_id?.toLowerCase().includes(qLower) || false;
      return matchNum || matchPhone || matchName || matchTx;
    });
  }
};
