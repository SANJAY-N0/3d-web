import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LiveOrderDetailsModal } from '../../components/admin/LiveOrderDetailsModal';
import { orderService } from '../../services/orderService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Order, OrderStatus } from '../../types';
import { formatINR } from '../../lib/upiUtils';
import {
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Box,
  User,
  Phone,
  DollarSign,
  CreditCard,
  Eye,
  Check,
  XCircle,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

type FilterType = 'all' | 'pending' | 'confirmed' | 'cash' | 'online' | 'today';

export const AdminLiveOrders: React.FC = () => {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    pendingOrders: 0,
    confirmedOrders: 0,
    cashPending: 0,
    onlinePaid: 0,
    totalLiveOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Load orders from API
  const fetchLiveOrders = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const result = await orderService.getLiveOrders({
        status: activeFilter,
        search: searchQuery,
      });
      setOrders(result.orders);
      if (result.stats) {
        setStats(result.stats);
      }
    } catch (err: any) {
      console.error('Failed to load live orders:', err);
      setError(err.message || 'Unable to load live orders.');
      showToast('Failed to refresh live orders.', 'error');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [activeFilter, searchQuery, showToast]);

  useEffect(() => {
    fetchLiveOrders(true);
  }, [fetchLiveOrders]);

  // Supabase Realtime Subscription Setup
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase Realtime not available: missing client configuration.');
      return;
    }

    console.log('Connecting to Supabase Realtime for live orders...');
    const channel = supabase
      .channel('admin-live-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          console.log('🔴 Realtime INSERT on orders:', payload.new);
          showToast(`🔔 New Order #${payload.new.order_number || ''} just arrived!`, 'info');

          // Fetch full joined record
          try {
            const freshOrder = await orderService.getById(payload.new.id);
            if (freshOrder) {
              setOrders((prev) => {
                const exists = prev.some((o) => o.id === freshOrder.id);
                if (exists) return prev;
                return [freshOrder, ...prev];
              });
              // Update stats
              setStats((prev) => ({
                ...prev,
                pendingOrders: prev.pendingOrders + 1,
                cashPending: freshOrder.payment_method === 'CASH' ? prev.cashPending + 1 : prev.cashPending,
                totalLiveOrders: prev.totalLiveOrders + 1,
              }));
            }
          } catch (fetchErr) {
            fetchLiveOrders();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        async (payload) => {
          console.log('🔄 Realtime UPDATE on orders:', payload.new);
          try {
            const updated = await orderService.getById(payload.new.id);
            if (updated) {
              setOrders((prev) =>
                prev.map((o) => (o.id === updated.id ? updated : o))
              );
              if (selectedOrder && selectedOrder.id === updated.id) {
                setSelectedOrder(updated);
              }
            }
          } catch {
            fetchLiveOrders();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments' },
        async (payload) => {
          console.log('💰 Realtime UPDATE on payments:', payload.new);
          if (payload.new.order_id) {
            try {
              const updated = await orderService.getById(payload.new.order_id);
              if (updated) {
                setOrders((prev) =>
                  prev.map((o) => (o.id === updated.id ? updated : o))
                );
                if (selectedOrder && selectedOrder.id === updated.id) {
                  setSelectedOrder(updated);
                }
              }
            } catch {
              fetchLiveOrders();
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLiveConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsLiveConnected(false);
        }
      });

    return () => {
      console.log('Cleaning up live orders realtime subscription...');
      supabase?.removeChannel(channel);
    };
  }, [fetchLiveOrders, selectedOrder, showToast]);

  // Order Actions
  const handleConfirmOrder = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const updated = await orderService.confirmOrder(orderId);
      showToast(`Order #${updated.order_number} confirmed!`, 'success');
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      setStats((prev) => ({
        ...prev,
        pendingOrders: Math.max(0, prev.pendingOrders - 1),
        confirmedOrders: prev.confirmedOrders + 1,
      }));
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm order.', 'error');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const updated = await orderService.cancelOrder(orderId);
      showToast(`Order #${updated.order_number} cancelled.`, 'info');
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order.', 'error');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleMarkCashReceived = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const result = await orderService.markCashReceived(orderId);
      showToast(`Cash payment marked as received for #${result.order.order_number}!`, 'success');
      setOrders((prev) => prev.map((o) => (o.id === result.order.id ? result.order : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(result.order);
      }
      setStats((prev) => ({
        ...prev,
        cashPending: Math.max(0, prev.cashPending - 1),
      }));
    } catch (err: any) {
      showToast(err.message || 'Failed to mark cash as received.', 'error');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleVerifyOnlinePayment = async (orderId: string, txId?: string, notes?: string) => {
    setProcessingOrderId(orderId);
    try {
      const result = await orderService.verifyPaymentAdmin(orderId, txId, notes);
      showToast(`Online payment verified for #${result.order.order_number}!`, 'success');
      setOrders((prev) => prev.map((o) => (o.id === result.order.id ? result.order : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(result.order);
      }
      setStats((prev) => ({
        ...prev,
        onlinePaid: prev.onlinePaid + 1,
      }));
    } catch (err: any) {
      showToast(err.message || 'Failed to verify online payment.', 'error');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Open modal with selected order
  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const filterTabs: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending', count: stats.pendingOrders },
    { key: 'confirmed', label: 'Confirmed', count: stats.confirmedOrders },
    { key: 'cash', label: 'Cash Pending', count: stats.cashPending },
    { key: 'online', label: 'Online Paid', count: stats.onlinePaid },
    { key: 'today', label: 'Today' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                Live Orders
              </h1>
              {/* Realtime Live Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-colors ${
                  isLiveConnected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/40 shadow-sm'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-600/40'
                }`}
                title={isLiveConnected ? 'Supabase Realtime WebSocket Active' : 'Connecting to Realtime...'}
              >
                <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{isLiveConnected ? 'LIVE ●' : 'SYNCING'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Incoming customer orders arrive in real time without refreshing. Verify payments and confirm orders immediately.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLiveOrders(false)}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Dashboard Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 dark:text-neutral-400 font-semibold block">
                Pending Orders
              </span>
              <span className="font-display font-bold text-2xl text-amber-600 dark:text-amber-400">
                {stats.pendingOrders}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              🟡
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 dark:text-neutral-400 font-semibold block">
                Confirmed Orders
              </span>
              <span className="font-display font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                {stats.confirmedOrders}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              🟢
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 dark:text-neutral-400 font-semibold block">
                Cash Pending
              </span>
              <span className="font-display font-bold text-2xl text-indigo-600 dark:text-indigo-400">
                {stats.cashPending}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              💰
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 dark:text-neutral-400 font-semibold block">
                Online Paid
              </span>
              <span className="font-display font-bold text-2xl text-cyan-600 dark:text-cyan-400">
                {stats.onlinePaid}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
              💳
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filterTabs.map((tab) => {
              const isSelected = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20'
                      : 'bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isSelected ? 'bg-white text-cyan-800' : 'bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, phone..."
              className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>
        </div>

        {/* Orders List / Cards */}
        {loading ? (
          /* Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4 animate-pulse">
                <div className="h-5 bg-slate-200 dark:bg-neutral-800 rounded-md w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded-md w-1/2" />
                <div className="h-8 bg-slate-200 dark:bg-neutral-800 rounded-md w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="p-10 rounded-2xl bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-900 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Unable to load live orders</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">{error}</p>
            <button
              type="button"
              onClick={() => fetchLiveOrders(true)}
              className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-semibold text-xs cursor-pointer hover:bg-cyan-500"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="p-12 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-400 flex items-center justify-center mx-auto">
              <Box className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">No live orders right now</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
              Orders placed by customers will automatically appear here in real time without refreshing.
            </p>
          </div>
        ) : (
          /* Order Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => {
              const isCash = order.payment_method === 'CASH';
              const isPendingCash = isCash && (order.payment_status === 'CASH_PENDING' || order.payment_status === 'PENDING');
              const isConfirmed = ['CONFIRMED', 'PAYMENT_CONFIRMED', 'ORDER_PROCESSING', 'PRINTING', 'READY', 'READY_FOR_PICKUP', 'COMPLETED'].includes(order.order_status);
              const isCancelled = order.order_status === 'CANCELLED';
              const isProcessing = processingOrderId === order.id;

              const items = (order.order_items && order.order_items.length > 0)
                ? order.order_items
                : (order.items && order.items.length > 0)
                ? order.items
                : [
                    {
                      id: `item-${order.id}`,
                      order_id: order.id,
                      product_id: order.product_id,
                      product_name: order.product?.name || '3D Printed Model',
                      quantity: order.quantity || 1,
                      unit_price: order.unit_price || 0,
                      total_price: order.total_amount || 0,
                    },
                  ];

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border p-5 transition-all shadow-sm flex flex-col justify-between gap-4 ${
                    isConfirmed
                      ? 'bg-white dark:bg-neutral-900/90 border-slate-200 dark:border-neutral-800'
                      : 'bg-white dark:bg-neutral-900 border-cyan-200 dark:border-cyan-900/50 hover:shadow-md'
                  }`}
                >
                  {/* Top Row: Order Number, Time & Badges */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {order.order_number}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                            {items.length} {items.length === 1 ? 'Product' : 'Products'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {order.customer_name || order.customer?.name || 'Customer'}
                          </span>
                          <span>•</span>
                          <span className="font-mono">
                            {order.customer_mobile || order.customer?.phone || 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-base text-cyan-600 dark:text-cyan-400 block">
                          {formatINR(order.total_amount)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500">
                          {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Status & Method Badges */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <StatusBadge status={order.order_status} type="order" size="sm" />
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold ${
                        isCash
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/40'
                          : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/40'
                      }`}>
                        {isCash ? '💰 CASH' : '💳 ONLINE'}
                      </span>
                      {order.payment_status && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                          order.payment_status === 'PAID' || order.payment_status === 'CASH_RECEIVED'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}>
                          {order.payment_status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {/* Products Snapshot List */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800/80 space-y-1 text-xs">
                      {items.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-700 dark:text-neutral-300 truncate max-w-[200px] sm:max-w-xs">
                            {item.product_name}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-neutral-400">
                            × {item.quantity} ({formatINR(item.total_price || item.unit_price * item.quantity)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/60 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenOrder(order)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>View Order</span>
                      </button>

                      {isCash && isPendingCash && (
                        <button
                          type="button"
                          onClick={() => handleMarkCashReceived(order.id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{isProcessing ? 'Saving...' : 'Cash Received'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isConfirmed && !isCancelled && (
                        <button
                          type="button"
                          onClick={() => handleConfirmOrder(order.id)}
                          disabled={isProcessing}
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-cyan-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isProcessing ? 'Confirming...' : 'Confirm'}</span>
                        </button>
                      )}

                      {isConfirmed && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <LiveOrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        onConfirmOrder={handleConfirmOrder}
        onCancelOrder={handleCancelOrder}
        onMarkCashReceived={handleMarkCashReceived}
        onVerifyOnlinePayment={handleVerifyOnlinePayment}
      />
    </AdminLayout>
  );
};
