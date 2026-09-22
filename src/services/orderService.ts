import { Order, OrderStatus, AdminStats, PaymentMethod, PosBillRequest, PosBillResponse } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateOrderNumber } from '../lib/upiUtils';
import { productService } from './productService';
import { authService } from './authService';

const FAKE_ORDER_NUMBERS = new Set(['3DP-2026-00124', '3DP-2026-00125', '3DP-2026-00126']);

function isFakeOrder(o: any): boolean {
  if (!o) return true;
  if (o.order_number && FAKE_ORDER_NUMBERS.has(o.order_number.toUpperCase())) return true;
  if (o.product?.name && o.product.name.trim().toLowerCase() === 'nothing') return true;
  if (o.product_id === 'nothing' || o.id === 'nothing') return true;
  return false;
}

function normalizeOrder(o: any): Order {
  if (!o) return o;
  const payment = Array.isArray(o.payment) ? o.payment[0] || null : o.payment;
  const cust = o.customization || {};
  let items = Array.isArray(o.order_items) && o.order_items.length > 0 ? o.order_items : (cust.items || []);
  if (items.length === 0 && (o.product || o.product_id)) {
    items = [
      {
        id: `legacy-${o.id}`,
        order_id: o.id,
        product_id: o.product_id,
        product_name: o.product?.name || "3D Printed Model",
        quantity: o.quantity || 1,
        unit_price: o.unit_price || o.product?.price || 0,
        total_price: o.total_amount || 0,
        customization: o.customization || {},
        created_at: o.created_at,
      },
    ];
  }
  return {
    ...o,
    customer_name: o.customer_name || cust.customer_name || o.customer?.name || "Walk-in Customer",
    customer_mobile: o.customer_mobile || cust.customer_mobile || o.customer?.phone || "",
    customer_email: o.customer_email || cust.customer_email || o.customer?.email || "",
    payment_method: o.payment_method || cust.payment_method || (payment?.payment_method) || (cust.is_pos_bill ? "CASH" : "ONLINE"),
    payment_status: o.payment_status || cust.payment_status || (payment?.payment_status) || "COMPLETED",
    subtotal: o.subtotal || cust.subtotal || o.total_amount,
    payment,
    order_items: items,
    items,
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
    payment_method?: PaymentMethod;
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
    payment_method?: PaymentMethod;
  }): Promise<Order> {
    const paymentMethod = orderPayload.payment_method || 'ONLINE';

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
          payment_method: paymentMethod,
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
        const initialPaymentStatus = paymentMethod === 'CASH' ? 'CASH_PENDING' : 'PENDING';

        const { data: dbOrder, error: dbError } = await supabase
          .from('orders')
          .insert([{
            order_number: orderNumber,
            customer_id: orderPayload.customer_id,
            customer_name: orderPayload.customer?.name || 'Customer',
            customer_mobile: orderPayload.customer?.phone || '',
            customer_email: orderPayload.customer?.email || null,
            product_id: orderPayload.product_id,
            quantity: orderPayload.quantity,
            unit_price: orderPayload.unit_price,
            subtotal: validatedTotal,
            total_amount: validatedTotal,
            customization: orderPayload.customization,
            payment_method: paymentMethod,
            payment_status: initialPaymentStatus,
            order_status: 'PENDING',
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
          // Insert order_items snapshot if table exists
          try {
            await supabase.from('order_items').insert([{
              order_id: dbOrder.id,
              product_id: orderPayload.product_id,
              product_name: orderPayload.product?.name || '3D Printed Model',
              quantity: orderPayload.quantity,
              unit_price: orderPayload.unit_price || 0,
              total_price: validatedTotal,
              customization: orderPayload.customization || {},
            }]).maybeSingle();
          } catch (itemErr) {
            console.warn('Notice: order_items insert skipped or table absent:', itemErr);
          }

          const { data: dbPayment } = await supabase
            .from('payments')
            .insert([{
              order_id: dbOrder.id,
              amount: validatedTotal,
              payment_method: paymentMethod,
              payment_status: initialPaymentStatus,
              payment_gateway: paymentMethod === 'CASH' ? 'CASH' : 'UPI',
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

  /**
   * Fetch live orders for admin live orders screen
   */
  async getLiveOrders(filters?: { status?: string; search?: string }): Promise<{ orders: Order[]; stats: any }> {
    const statusParam = filters?.status || 'all';
    const searchParam = filters?.search || '';
    const token = await authService.getAdminToken();

    try {
      const url = `/api/admin/orders/live?status=${encodeURIComponent(statusParam)}&search=${encodeURIComponent(searchParam)}`;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          return {
            orders: data.orders.map(normalizeOrder),
            stats: data.stats || {},
          };
        }
      }
    } catch (err) {
      console.warn('Backend getLiveOrders failed, falling back to direct Supabase:', err);
    }

    // Direct Supabase fallback
    const all = await this.getAll();
    const stats = {
      pendingOrders: all.filter((o) => ['PENDING', 'ORDER_PLACED', 'PAYMENT_PROCESSING', 'PENDING_PAYMENT', 'PENDING_PAYMENT_VERIFICATION'].includes(o.order_status)).length,
      confirmedOrders: all.filter((o) => ['CONFIRMED', 'PAYMENT_CONFIRMED', 'ORDER_PROCESSING', 'PRINTING', 'READY', 'READY_FOR_PICKUP'].includes(o.order_status)).length,
      cashPending: all.filter((o) => o.payment_method === 'CASH' && (o.payment_status === 'CASH_PENDING' || o.payment?.payment_status === 'CASH_PENDING' || o.payment_status === 'PENDING')).length,
      onlinePaid: all.filter((o) => (o.payment_method === 'ONLINE' || !o.payment_method) && (o.payment_status === 'PAID' || o.payment?.payment_status === 'PAID' || o.payment_status === 'VERIFIED' || o.order_status === 'PAYMENT_CONFIRMED' || o.order_status === 'PAYMENT_VERIFIED')).length,
      totalLiveOrders: all.length,
    };

    let filtered = all;
    if (statusParam === 'pending') {
      filtered = filtered.filter((o) => ['PENDING', 'ORDER_PLACED', 'PAYMENT_PROCESSING', 'PENDING_PAYMENT', 'PENDING_PAYMENT_VERIFICATION'].includes(o.order_status));
    } else if (statusParam === 'confirmed') {
      filtered = filtered.filter((o) => ['CONFIRMED', 'PAYMENT_CONFIRMED', 'ORDER_PROCESSING', 'PRINTING', 'READY', 'READY_FOR_PICKUP'].includes(o.order_status));
    } else if (statusParam === 'cash') {
      filtered = filtered.filter((o) => o.payment_method === 'CASH');
    } else if (statusParam === 'online') {
      filtered = filtered.filter((o) => o.payment_method === 'ONLINE' || !o.payment_method);
    } else if (statusParam === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      filtered = filtered.filter((o) => new Date(o.created_at).getTime() >= startOfToday.getTime());
    }

    if (searchParam.trim()) {
      const q = searchParam.toLowerCase();
      filtered = filtered.filter((o) => {
        const matchNum = o.order_number?.toLowerCase().includes(q);
        const matchName = (o.customer_name || o.customer?.name || '').toLowerCase().includes(q);
        const matchPhone = (o.customer_mobile || o.customer?.phone || '').toLowerCase().includes(q);
        const matchTx = (o.payment?.transaction_id || '').toLowerCase().includes(q);
        const matchProd = (o.product?.name || '').toLowerCase().includes(q) ||
          (o.order_items || []).some((item) => item.product_name?.toLowerCase().includes(q));
        return matchNum || matchName || matchPhone || matchTx || matchProd;
      });
    }

    return { orders: filtered, stats };
  },

  /**
   * Confirm order via Admin API
   */
  async confirmOrder(orderId: string): Promise<Order> {
    const token = await authService.getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/confirm`, {
      method: 'POST',
      headers,
    });

    const data = await res.json();
    if (res.ok && data.success && data.order) {
      return normalizeOrder(data.order);
    }

    if (!res.ok) {
      throw new Error(data.error || 'Failed to confirm order.');
    }

    return this.updateStatus(orderId, 'CONFIRMED');
  },

  /**
   * Cancel order via Admin API
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const token = await authService.getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.order) {
      return normalizeOrder(data.order);
    }

    if (!res.ok) {
      throw new Error(data.error || 'Failed to cancel order.');
    }

    return this.updateStatus(orderId, 'CANCELLED');
  },

  /**
   * Mark cash payment received via Admin API
   */
  async markCashReceived(orderId: string, notes?: string): Promise<{ order: Order; payment: any }> {
    const token = await authService.getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/payment/cash-received`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notes }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.order) {
      return {
        order: normalizeOrder(data.order),
        payment: data.payment,
      };
    }

    throw new Error(data.error || 'Failed to mark cash as received.');
  },

  /**
   * Verify online payment via Admin API
   */
  async verifyPaymentAdmin(orderId: string, transactionId?: string, notes?: string): Promise<{ order: Order; payment: any }> {
    const token = await authService.getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/payment/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transactionId, notes }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.order) {
      return {
        order: normalizeOrder(data.order),
        payment: data.payment,
      };
    }

    throw new Error(data.error || 'Failed to verify payment.');
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
  },

  /**
   * Create POS bill from admin counter
   */
  async createPosBill(billData: PosBillRequest): Promise<PosBillResponse> {
    const token = await authService.getAdminToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/admin/pos/create-bill', {
      method: 'POST',
      headers,
      body: JSON.stringify(billData),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create POS bill.');
    }

    return {
      ...data,
      order: normalizeOrder(data.order),
    };
  },

  /**
   * Fetch recent POS bills
   */
  async getPosBills(): Promise<Order[]> {
    const token = await authService.getAdminToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch('/api/admin/pos/bills', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.bills)) {
          return data.bills.map(normalizeOrder);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch POS bills from API, falling back to local query:', err);
    }

    // Fallback: fetch all orders and filter
    const all = await this.getAll();
    return all.filter((o) => (o.customization as any)?.is_pos_bill || o.order_number.startsWith('POS-'));
  },
};
