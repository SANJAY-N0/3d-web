import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { orderService } from '../services/orderService';
import { Order } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { StepProgress } from '../components/common/StepProgress';
import {
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  Copy,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const OrderSuccess: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Trigger celebratory confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#6366f1', '#a855f7', '#10b981'],
      });
    } catch (e) {
      // ignore
    }

    if (id) {
      orderService
        .getById(id)
        .then((data) => {
          if (data) setOrder(data);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleCopyOrderId = () => {
    if (order?.order_number) {
      navigator.clipboard.writeText(order.order_number);
      showToast(`Copied Order Number: ${order.order_number}`, 'success');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const orderNum = order?.order_number || id || '';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Step Progress */}
      <StepProgress currentStep="success" />

      {/* Main Confirmation Box */}
      <div className="bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-sm dark:shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Success Icon */}
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white">
            Order Confirmed!
          </h1>
          <p className="text-slate-600 dark:text-neutral-400 text-sm max-w-md mx-auto leading-relaxed">
            Your 3D print order has been placed successfully and assigned to the precision printing queue.
          </p>
        </div>

        {/* Order ID & Status Badge Box */}
        <div className="bg-slate-50 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800/90 rounded-2xl p-5 max-w-md mx-auto space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-500 dark:text-neutral-400">Order Reference</span>
            <button
              onClick={handleCopyOrderId}
              className="text-xs font-mono text-cyan-700 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>{orderNum}</span>
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-neutral-800/80">
            <span className="text-xs font-mono uppercase text-slate-500 dark:text-neutral-400">Payment Status</span>
            <StatusBadge
              status={order?.payment?.payment_status || 'VERIFIED'}
              type="payment"
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-neutral-800/80">
            <span className="text-xs font-mono uppercase text-slate-500 dark:text-neutral-400">Production Status</span>
            <StatusBadge
              status={order?.order_status || 'PAYMENT_CONFIRMED'}
              type="order"
              size="sm"
            />
          </div>
        </div>

        {/* Next Steps Banner */}
        <div className="bg-slate-50 dark:bg-neutral-950/40 rounded-xl p-4 border border-slate-200 dark:border-neutral-800/80 text-left max-w-md mx-auto text-xs space-y-2 text-slate-600 dark:text-neutral-400">
          <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300 font-mono font-semibold">
            <Printer className="w-4 h-4" /> What Happens Next:
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-neutral-400">
            <li>Your 3D model is sliced and dispatched to our high-speed printers.</li>
            <li>You can track real-time printing progress on the live tracker.</li>
            <li>Receive your print via direct campus hand-delivery or courier.</li>
          </ul>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/products"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-300 dark:border-neutral-700 transition-all cursor-pointer shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Back to Products</span>
          </Link>

          <Link
            to={`/track?order=${orderNum}`}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Track Live Status</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
