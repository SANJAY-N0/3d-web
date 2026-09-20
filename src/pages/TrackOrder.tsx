import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { Order, OrderStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatINR } from '../lib/upiUtils';
import {
  Search,
  Box,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Package,
  Layers,
  Sparkles,
  CreditCard,
  MapPin,
  Calendar,
  Share2,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';

interface TrackingStage {
  id: number;
  key: OrderStatus | string;
  matchingStatuses: string[];
  label: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
}

const TRACKING_STAGES: TrackingStage[] = [
  {
    id: 1,
    key: 'ORDER_CONFIRMED',
    matchingStatuses: [
      'ORDER_PLACED',
      'PENDING_PAYMENT',
      'PAYMENT_PROCESSING',
      'PENDING_PAYMENT_VERIFICATION',
      'PAYMENT_CONFIRMED',
      'PAYMENT_VERIFIED',
    ],
    label: 'Order Confirmed',
    subtitle: 'Received & Verified',
    description: 'Order details and payment verified. Scheduled for 3D printing.',
    icon: CheckCircle2,
  },
  {
    id: 2,
    key: 'PREPARING',
    matchingStatuses: ['ORDER_PROCESSING', 'PRINTING'],
    label: 'Preparing',
    subtitle: 'Slicing & 3D Printing',
    description: 'Precision slicing completed. 3D printer actively laying down layers.',
    icon: Layers,
  },
  {
    id: 3,
    key: 'READY',
    matchingStatuses: ['PRODUCT_READY', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],
    label: 'Ready',
    subtitle: 'Ready for Handover',
    description: 'Print finished, inspected, and ready for campus pickup or handover.',
    icon: Sparkles,
  },
  {
    id: 4,
    key: 'DELIVERED',
    matchingStatuses: ['DELIVERED', 'COMPLETED'],
    label: 'Delivered',
    subtitle: 'Order Complete',
    description: 'Successfully handed over to customer. Enjoy your 3D print!',
    icon: CheckCircle2,
  },
];

export const TrackOrder: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const locationState = location.state as { orderId?: string; orderNumber?: string; order?: Order } | undefined;
  const { showToast } = useToast();

  const initialSearch = searchParams.get('order') || locationState?.orderNumber || locationState?.orderId || '';
  const [query, setQuery] = useState(initialSearch);
  const [order, setOrder] = useState<Order | null>(locationState?.order || null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(locationState?.order || searchParams.get('order')));

  // Helper to determine the 1-based index (1 to 4) of the current stage
  const calculateCurrentStageIndex = (status: OrderStatus): number => {
    for (let i = 0; i < TRACKING_STAGES.length; i++) {
      if (TRACKING_STAGES[i].matchingStatuses.includes(status)) {
        return i + 1;
      }
    }
    return 1;
  };

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const foundOrder = await orderService.trackOrder(searchTerm.trim());
      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        setOrder(null);
        showToast('No matching order found. Please check the order number or phone.', 'info');
      }
    } catch (err: any) {
      showToast('Error searching for order.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const orderParam = searchParams.get('order') || '';

  useEffect(() => {
    window.scrollTo(0, 0);
    const searchTarget = orderParam || locationState?.orderNumber || locationState?.orderId;
    if (searchTarget) {
      setQuery(searchTarget);
      if (locationState?.order) {
        setOrder(locationState.order);
        setHasSearched(true);
      }
      executeSearch(searchTarget);
    }
  }, [orderParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ order: query });
    executeSearch(query);
  };

  const currentStageNum = order ? calculateCurrentStageIndex(order.order_status) : 1;
  const isCancelled = order?.order_status === 'CANCELLED';

  // Calculate progress percentage for the progress bar (0% to 100%)
  const progressPercentage = isCancelled
    ? 0
    : Math.round(((currentStageNum - 1) / (TRACKING_STAGES.length - 1)) * 100);

  const activeStage = TRACKING_STAGES[currentStageNum - 1] || TRACKING_STAGES[0];

  const isCollegeDelivery =
    order?.customer?.delivery_method === 'college_delivery' ||
    (order?.customer?.college_type === 'KPR College' && !order?.customer?.address?.includes('Door No'));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Search Header */}
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 text-xs font-mono text-cyan-700 dark:text-cyan-300 font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Live Order Tracking</span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white">
          Track Your 3D Creation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400">
          Enter your Order ID or Mobile Number to monitor live slicing and delivery progress.
        </p>

        {/* Search input bar */}
        <form onSubmit={handleSearch} className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Order Number or Phone..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-2xl text-xs shadow-lg shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Track</span>
            )}
          </button>
        </form>
      </div>

      {/* Main Tracking UI */}
      {order && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top Status Card */}
          <div className="bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm dark:shadow-2xl">
            {/* Header: Order Number & Delivery Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-neutral-800/80 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 font-semibold">
                    Order ID
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                    {order.order_number}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 font-mono pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Placed:{' '}
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isCollegeDelivery ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Campus Hand Delivery (KPR)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 text-xs font-mono font-semibold">
                    <Truck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Home Courier Delivery</span>
                  </div>
                )}
                <StatusBadge status={order.order_status} type="order" size="md" />
              </div>
            </div>

            {/* PROGRESS BAR TRACKING SYSTEM */}
            {!isCancelled ? (
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-300 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Order Status Progression</span>
                  </span>
                  <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-bold">
                    Stage {currentStageNum} of 4 ({progressPercentage}% Complete)
                  </span>
                </div>

                {/* Desktop/Tablet Horizontal Stepper with Continuous Progress Bar */}
                <div className="relative hidden md:block pt-4 pb-2">
                  {/* Background Track Line: spans between center of column 1 and column 4 */}
                  <div className="absolute top-9 left-[12.5%] right-[12.5%] h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full z-0 overflow-hidden">
                    {/* Active Progress Gradient Bar */}
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  {/* 4 Step Nodes */}
                  <div className="grid grid-cols-4 relative z-10">
                    {TRACKING_STAGES.map((stage, idx) => {
                      const isPast = currentStageNum > stage.id;
                      const isCurrent = currentStageNum === stage.id;
                      const isFuture = currentStageNum < stage.id;
                      const Icon = stage.icon;

                      return (
                        <div key={stage.id} className="flex flex-col items-center text-center px-1">
                          {/* Circle Icon Badge */}
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md ${
                              isCurrent
                                ? 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white ring-4 ring-cyan-500/20 scale-110 shadow-cyan-500/25 animate-pulse'
                                : isPast
                                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                                : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-600 border border-slate-200 dark:border-neutral-700'
                            }`}
                          >
                            {isPast ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                          </div>

                          {/* Labels */}
                          <div className="mt-3 space-y-0.5">
                            <span
                              className={`text-xs font-semibold block leading-tight ${
                                isCurrent
                                  ? 'text-cyan-700 dark:text-cyan-300 font-bold'
                                  : isPast
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-400 dark:text-neutral-500'
                              }`}
                            >
                              {stage.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 block">
                              {stage.subtitle}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Vertical Stepper View */}
                <div className="md:hidden space-y-3 pt-2">
                  {TRACKING_STAGES.map((stage, idx) => {
                    const isPast = currentStageNum > stage.id;
                    const isCurrent = currentStageNum === stage.id;
                    const Icon = stage.icon;

                    return (
                      <div
                        key={stage.id}
                        className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                          isCurrent
                            ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-700/50 ring-1 ring-cyan-500/20'
                            : isPast
                            ? 'bg-slate-50 dark:bg-neutral-950/60 border-slate-200 dark:border-neutral-800/80 text-slate-700 dark:text-neutral-300'
                            : 'bg-transparent border-slate-200/60 dark:border-neutral-900 text-slate-400 dark:text-neutral-600 opacity-60'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                            isCurrent
                              ? 'bg-cyan-600 text-white'
                              : isPast
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-neutral-800 text-slate-500'
                          }`}
                        >
                          {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                isCurrent ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {stage.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-600 text-white uppercase font-bold">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-neutral-400">{stage.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Stage Highlight Box */}
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0">
                      <activeStage.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-bold block">
                        Active Step: {activeStage.label}
                      </span>
                      <p className="text-xs text-slate-700 dark:text-neutral-300 font-medium">
                        {activeStage.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 shrink-0">
                    Est. Duration: ~2–6 hrs
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <span className="font-bold block">Order Cancelled</span>
                  <span>This order is cancelled. Please contact the stall admin if this was unexpected.</span>
                </div>
              </div>
            )}
          </div>

          {/* Details 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Box: 3D Product & Specifications */}
            <div className="bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 space-y-4 shadow-sm dark:shadow-xl">
              <span className="text-xs font-mono uppercase text-slate-500 dark:text-neutral-400 font-bold flex items-center gap-2">
                <Box className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>3D Product Details</span>
              </span>

              <div className="flex items-center gap-4 pt-1">
                {order.product?.image_url && (
                  <img
                    src={order.product.image_url}
                    alt={order.product.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-neutral-800 shadow-sm"
                  />
                )}
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    {order.product?.name || 'Custom 3D Print'}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                    Qty: <b className="text-slate-900 dark:text-white">{order.quantity}</b> • Total:{' '}
                    <b className="text-cyan-600 dark:text-cyan-400">{formatINR(order.total_amount)}</b>
                  </div>
                </div>
              </div>

              {/* Customization specs */}
              {order.customization && (
                <div className="p-3 bg-slate-50 dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-neutral-800/80 text-xs font-mono space-y-1.5">
                  {order.customization.selectedColor && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-neutral-400">Colorway:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {order.customization.selectedColor}
                      </span>
                    </div>
                  )}

                  {order.customization.customText && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-neutral-400">Custom Text / Monogram:</span>
                      <span className="font-bold text-cyan-700 dark:text-cyan-300">
                        {order.customization.customText}
                      </span>
                    </div>
                  )}

                  {order.customization.specialInstructions && (
                    <div className="pt-1 text-[11px] text-slate-500 dark:text-neutral-400 border-t border-slate-200 dark:border-neutral-800">
                      Note: {order.customization.specialInstructions}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Box: Delivery & Recipient Info */}
            <div className="bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 space-y-4 shadow-sm dark:shadow-xl">
              <span className="text-xs font-mono uppercase text-slate-500 dark:text-neutral-400 font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Recipient & Handover Destination</span>
              </span>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-neutral-800/60">
                  <span className="text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Name:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {order.customer?.name || 'Customer'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-neutral-800/60">
                  <span className="text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone:
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {order.customer?.phone || 'N/A'}
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block font-semibold uppercase">
                    Delivery Address / Campus Location:
                  </span>
                  <p className="text-xs text-slate-800 dark:text-neutral-200 bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800">
                    {order.customer?.address || 'KPR College Campus, Coimbatore'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-2">
            <Link
              to="/products"
              className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Explore more 3D prints →</span>
            </Link>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showToast('Tracking link copied to clipboard!', 'success');
              }}
              className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Tracking Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Initial state before searching */}
      {!hasSearched && !order && !loading && (
        <div className="p-10 text-center bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 rounded-3xl space-y-4 shadow-sm max-w-lg mx-auto">
          <Package className="w-10 h-10 text-cyan-600 dark:text-cyan-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">Real-Time Order Tracking</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Enter your Order ID or 10-digit Mobile Number in the box above to track live 3D printing and delivery updates.
            </p>
          </div>
        </div>
      )}

      {/* No Order Found empty state */}
      {hasSearched && !order && !loading && (
        <div className="p-10 text-center bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 rounded-3xl space-y-4 shadow-sm max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-slate-400 dark:text-neutral-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">No Order Found</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              We couldn't find an order matching "{query}". Please check your order reference number or mobile number.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500 transition-all"
          >
            <span>Browse Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};
