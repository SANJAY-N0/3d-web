import React, { useState } from 'react';
import { Order } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR } from '../../lib/upiUtils';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Box,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  DollarSign,
  CreditCard,
  Building2,
  Calendar,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface LiveOrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmOrder: (orderId: string) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onMarkCashReceived?: (orderId: string) => Promise<void>;
  onVerifyOnlinePayment?: (orderId: string, txId?: string, notes?: string) => Promise<void>;
}

export const LiveOrderDetailsModal: React.FC<LiveOrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirmOrder,
  onCancelOrder,
  onMarkCashReceived,
  onVerifyOnlinePayment,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [enlargedScreenshot, setEnlargedScreenshot] = useState(false);

  if (!isOpen || !order) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isCash = order.payment_method === 'CASH';
  const isOnline = !isCash;
  const isPendingCash = isCash && (order.payment_status === 'CASH_PENDING' || order.payment_status === 'PENDING');
  const isCashReceived = isCash && order.payment_status === 'CASH_RECEIVED';
  const isOnlinePaid = isOnline && (order.payment_status === 'PAID' || order.payment_status === 'VERIFIED');
  const isOrderConfirmed = ['CONFIRMED', 'PAYMENT_CONFIRMED', 'ORDER_PROCESSING', 'PRINTING', 'READY', 'READY_FOR_PICKUP', 'COMPLETED'].includes(order.order_status);
  const isOrderCancelled = order.order_status === 'CANCELLED';

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirmOrder(order.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      await onCancelOrder(order.id);
      setShowCancelPrompt(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashReceived = async () => {
    if (!onMarkCashReceived) return;
    setIsProcessing(true);
    try {
      await onMarkCashReceived(order.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!onVerifyOnlinePayment) return;
    setIsProcessing(true);
    try {
      await onVerifyOnlinePayment(order.id, order.payment?.transaction_id);
    } finally {
      setIsProcessing(false);
    }
  };

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
          customization: order.customization,
        },
      ];

  const screenshotUrl = order.payment?.screenshot_url || order.payment?.payment_screenshot_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-xl">
              <Box className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white font-mono">
                  {order.order_number}
                </h2>
                <StatusBadge status={order.order_status} type="order" size="sm" />
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono ${
                  isCash
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/40'
                    : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/40'
                }`}>
                  {isCash ? '💰 CASH' : '💳 ONLINE'}
                </span>
                {order.payment_status && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                    order.payment_status === 'PAID' || order.payment_status === 'CASH_RECEIVED'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  }`}>
                    {order.payment_status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5 font-mono">
                <Clock className="w-3.5 h-3.5" /> Placed on {new Date(order.created_at).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1 text-slate-800 dark:text-neutral-200">
          {/* Cancel Confirmation Prompt */}
          {showCancelPrompt && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-3 animate-in fade-in">
              <h4 className="font-semibold text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                Are you sure you want to cancel this order?
              </h4>
              <p className="text-rose-700 dark:text-rose-400 text-xs">
                This action will mark the order as CANCELLED. All payment and customer records will be preserved.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  No, Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Cancelling...' : 'Yes, Cancel Order'}
                </button>
              </div>
            </div>
          )}

          {/* Grid Layout: Customer & Delivery Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Details */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-3">
              <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                <User className="w-3.5 h-3.5" /> Customer Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Name:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {order.customer_name || order.customer?.name || 'Customer'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Mobile:</span>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {order.customer_mobile || order.customer?.phone || 'N/A'}
                    </span>
                    {(order.customer_mobile || order.customer?.phone) && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(order.customer_mobile || order.customer?.phone || '', 'phone')}
                        className="p-1 text-slate-400 hover:text-cyan-500"
                        title="Copy Phone"
                      >
                        {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Email:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {order.customer_email || order.customer?.email || 'N/A'}
                  </span>
                </div>
                {order.customer?.college && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-neutral-400">College:</span>
                    <span className="text-slate-900 dark:text-white">{order.customer.college}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Details */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-3">
              <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <MapPin className="w-3.5 h-3.5" /> Delivery Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Method:</span>
                  <span className="font-semibold font-mono text-slate-900 dark:text-white uppercase">
                    {order.customer?.delivery_method === 'college_delivery' ? 'Campus Delivery' : 'Home Delivery'}
                  </span>
                </div>
                {order.customer?.delivery_method === 'college_delivery' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-neutral-400">Department:</span>
                      <span className="text-slate-900 dark:text-white">{order.customer?.department || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-neutral-400">Year / Section:</span>
                      <span className="text-slate-900 dark:text-white font-mono">
                        {order.customer?.year || ''} {order.customer?.section ? `(Sec ${order.customer.section})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-neutral-400">Building / Block:</span>
                      <span className="text-slate-900 dark:text-white">{order.customer?.building_block || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <span className="text-slate-500 dark:text-neutral-400 block">Address:</span>
                    <p className="text-slate-900 dark:text-white font-mono bg-white dark:bg-neutral-900 p-2 rounded-lg border border-slate-200 dark:border-neutral-800">
                      {order.customer?.address || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Products Snapshot Table */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-3">
            <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
              <Box className="w-3.5 h-3.5" /> Order Products ({items.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-mono text-[11px]">
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3">Color / Details</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="text-slate-900 dark:text-white">
                      <td className="py-2.5 px-3 font-semibold">
                        {item.product_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-400 font-mono">
                        {item.customization?.selectedColor || order.customization?.selectedColor || 'Standard'}
                        {item.customization?.customText && ` • Text: "${item.customization.customText}"`}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        × {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-neutral-400">
                        {formatINR(item.unit_price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {formatINR(item.total_price || item.unit_price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-neutral-700 font-bold">
                    <td colSpan={4} className="py-3 px-3 text-right text-slate-700 dark:text-neutral-300">
                      Total Order Amount:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-base text-cyan-600 dark:text-cyan-400">
                      {formatINR(order.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment & Audit Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Details */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-3">
              <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Payment Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Method:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {order.payment_method === 'CASH' ? '💵 CASH PAYMENT' : '💳 ONLINE / UPI'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Status:</span>
                  <span className={`font-mono font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                    order.payment_status === 'PAID' || order.payment_status === 'CASH_RECEIVED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {order.payment_status || 'PENDING'}
                  </span>
                </div>
                {order.payment?.transaction_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-neutral-400">UTR / Ref:</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {order.payment.transaction_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(order.payment?.transaction_id || '', 'utr')}
                        className="p-1 text-slate-400 hover:text-cyan-500"
                        title="Copy UTR"
                      >
                        {copiedField === 'utr' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
                {screenshotUrl && (
                  <div className="pt-2">
                    <span className="text-slate-500 dark:text-neutral-400 block mb-1.5">Payment Screenshot:</span>
                    <div className="relative group inline-block">
                      <img
                        src={screenshotUrl}
                        alt="Payment Proof"
                        className="w-24 h-24 object-cover rounded-lg border border-slate-300 dark:border-neutral-700 cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
                        onClick={() => setEnlargedScreenshot(true)}
                      />
                      <button
                        type="button"
                        onClick={() => setEnlargedScreenshot(true)}
                        className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white rounded text-[9px] font-mono flex items-center gap-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> View
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audit & Timestamps */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-3">
              <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Calendar className="w-3.5 h-3.5" /> Order Lifecycle
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Order ID:</span>
                  <span className="font-mono text-slate-700 dark:text-neutral-300 truncate max-w-[180px]">
                    {order.id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Created:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Confirmed At:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {order.confirmed_at ? new Date(order.confirmed_at).toLocaleString('en-IN') : 'Not yet confirmed'}
                  </span>
                </div>
                {order.confirmed_by && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-neutral-400">Confirmed By:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{order.confirmed_by}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Last Updated:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {new Date(order.updated_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enlarged Screenshot Modal */}
        {enlargedScreenshot && screenshotUrl && (
          <div
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setEnlargedScreenshot(false)}
          >
            <div className="relative max-w-2xl max-h-[90vh]">
              <img
                src={screenshotUrl}
                alt="Enlarged Payment Screenshot"
                className="max-h-[85vh] w-auto rounded-xl object-contain shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setEnlargedScreenshot(false)}
                className="absolute top-2 right-2 p-2 bg-black/70 text-white rounded-full hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isOrderCancelled && (
              <button
                type="button"
                onClick={() => setShowCancelPrompt(true)}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* For Cash orders: Mark cash received */}
            {isCash && isPendingCash && (
              <button
                type="button"
                onClick={handleCashReceived}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" />
                <span>Mark Cash Received</span>
              </button>
            )}

            {/* For Online orders: Verify Payment */}
            {isOnline && !isOnlinePaid && (
              <button
                type="button"
                onClick={handleVerifyPayment}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Payment</span>
              </button>
            )}

            {/* Confirm Order Button */}
            {!isOrderConfirmed && !isOrderCancelled ? (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-cyan-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isProcessing ? 'Confirming...' : 'Confirm Order'}</span>
              </button>
            ) : isOrderConfirmed ? (
              <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>ORDER CONFIRMED</span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
