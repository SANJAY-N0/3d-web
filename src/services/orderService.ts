import { Order, OrderStatus, AdminStats } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateOrderNumber } from '../lib/upiUtils';
import { productService } from './productService';

const FAKE_ORDER_NUMBERS = new Set(['3DP-2026-00124', '3DP-2026-00125', '3DP-2026-00126']);

function isFakeOrder(o: any): boolean {
  if (!o) return true;
  if (o.order_number && FAKE_ORDER_NUMBERS.has(o.order_number.toUpperCase())) return true;
  if (o.product?.name && o.product.name.trim().toLowerCase() === 'nothing') return true;
  if (o.product_id === 'nothing' || o.id === 'nothing') return true;
  return false;
}

function normalizeOrder(o: any): Order {
  return {
    ...o,
    payment: Array.isArray(o.payment) ? o.payment[0] || null : o.payment,
  };
}

export const orderService = {
  /**
   * Fetch all orders from Supabase (pure real database records)
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
   * Fetch order by ID or order number (via server API with fallback to Supabase)
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
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        let query = supabase
          .from('orders')
          .select(`
            *,
            product:products(*),
            customer:customers(*),
            payment:payments(*)
          `);

        if (isUUID) {
          query = query.or(`id.eq.${cleanId},order_number.eq.${cleanId}`);
        } else {
          query = query.ilike('order_number', cleanId);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data && !isFakeOrder(data)) {
          return normalizeOrder(data);
        }
      } catch (err) {
        console.warn('Supabase single order fetch failed:', err);
      }
    }

    return null;
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
    return [];
  },

  /**
   * Create new order with server-side validation and Supabase persistence
   */
  async create(orderPayload: {
    customer?: any;
    customer_id?: string;
    product_id: string;
    quantity: number;
    unit_price?: number;
    total_amount?: number;
    customization?: Order['customization'];
    product?: Order['product'];
  }): Promise<Order> {
    return this.createOrder(orderPayload);
  },

  async createOrder(orderPayload: {
    customer?: any;
    customer_id?: string;
    product_id: string;
    quantity: number;
    unit_price?: number;
    total_amount?: number;
    customization?: Order['customization'];
    product?: Order['product'];
  }): Promise<Order> {
    // 1. Call dedicated backend API endpoint /api/orders/create
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: orderPayload.customer,
          customer_id: orderPayload.customer_id,
          product_id: orderPayload.product_id,
          quantity: orderPayload.quantity,
          customization: orderPayload.customization,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        return normalizeOrder(data.order);
      } else {
        throw new Error(data.error || 'Failed to create order in database.');
      }
    } catch (err: any) {
      console.error('API /api/orders/create error:', err);

      // 2. Direct Supabase insert fallback if server endpoint is unreachable
      if (isSupabaseConfigured && supabase) {
        const orderNumber = generateOrderNumber();
        const sessionCreatedAt = new Date().toISOString();
        const sessionExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const validatedTotal = Number(orderPayload.unit_price || 0) * Number(orderPayload.quantity || 1);

        const { data: dbOrder, error: dbError } = await supabase
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
          .select(`
            *,
            product:products(*),
            customer:customers(*)
          `)
          .single();

        if (dbError) {
          console.error('Direct Supabase order insert failed:', dbError);
          throw new Error('Database error creating order: ' + dbError.message);
        }

        if (dbOrder) {
          const { data: dbPayment } = await supabase
            .from('payments')
            .insert([{
              order_id: dbOrder.id,
              amount: validatedTotal,
              payment_status: 'PENDING',
            }])
            .select()
            .single();

          return normalizeOrder({
            ...dbOrder,
            payment: dbPayment || null,
          });
        }
      }

      // Do NOT mask database failure by returning fake local orders!
      throw err;
    }
  },

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
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
        if (data) return normalizeOrder(data);
      } catch (err) {
        console.error('Supabase status update failed:', err);
        throw err;
      }
    }
    throw new Error('Database service unavailable');
  },

  /**
   * Delete an order
   */
  async delete(orderId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('orders').delete().eq('id', orderId);
      } catch (err) {
        console.error('Supabase order delete error:', err);
        throw err;
      }
    }
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

    if (modified && isSupabaseConfigured && supabase) {
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

  async trackOrder(query: string): Promise<Order | null> {
    const q = query.trim();
    if (!q) return null;

    try {
      const res = await fetch(`/api/orders/track?query=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order && !isFakeOrder(data.order)) {
          return normalizeOrder(data.order);
        }
      }
    } catch (err) {
      console.warn('Backend trackOrder error, falling back:', err);
    }

    // Fallback: search Supabase directly
    const results = await this.searchOrders(q);
    return results.length > 0 ? results[0] : null;
  },

  async searchOrders(query: string): Promise<Order[]> {
    const q = query.trim();
    if (!q) return [];

    // Try server-side track endpoint first for high reliability & RLS bypass
    try {
      const res = await fetch(`/api/orders/track?query=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order && !isFakeOrder(data.order)) {
          return [normalizeOrder(data.order)];
        }
      }
    } catch (err) {
      console.warn('Backend track search error, falling back to direct Supabase query:', err);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
        let query = supabase
          .from('orders')
          .select(`
            *,
            product:products(*),
            customer:customers(*),
            payment:payments(*)
          `);

        if (isUUID) {
          query = query.or(`order_number.ilike.%${q}%,id.eq.${q}`);
        } else {
          query = query.ilike('order_number', `%${q}%`);
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          return data.map(normalizeOrder).filter((o) => !isFakeOrder(o));
        }
      } catch (err) {
        console.warn('Supabase searchOrders error:', err);
      }
    }

    return [];
  }
};
