import React, { useState } from 'react';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR, UPI_CONFIG } from '../../lib/upiUtils';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Box,
  CheckCircle2,
  XCircle,
  Printer,
  PackageCheck,
  Check,
  ShieldCheck,
  AlertTriangle,
  FileImage,
  Sparkles,
  AlertOctagon,
  Copy,
  Eye,
  Flag,
} from 'lucide-react';
import { useToast } from '../common/Toast';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onVerifyPayment: (orderId: string, status: 'VERIFIED' | 'REJECTED' | 'PENDING_REVIEW', notes?: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onVerifyPayment,
  onUpdateOrderStatus,
}) => {
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'verify' | 'reject' | 'flag' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [showScreenshotEnlarged, setShowScreenshotEnlarged] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    showToast(`Copied ${fieldName} to clipboard`, 'success');
  };

  const handleVerifyConfirm = async (status: 'VERIFIED' | 'REJECTED' | 'PENDING_REVIEW') => {
    setIsProcessing(true);
    try {
      await onVerifyPayment(order.id, status, adminNotes || undefined);
      if (status === 'VERIFIED') {
        showToast('Payment verified successfully. Order ready for 3D printing!', 'success');
      } else if (status === 'REJECTED') {
        showToast('Payment rejected.', 'error');
      } else {
        showToast('Order flagged for review.', 'info');
      }
      setConfirmAction(null);
      setAdminNotes('');
    } catch (err: any) {
      showToast(err.message || 'Verification update failed.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsProcessing(true);
    try {
      await onUpdateOrderStatus(order.id, newStatus);
      showToast(`Order updated to: ${newStatus}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Status update failed.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const payment = order.payment;
  const isPendingVerification =
    order.order_status === 'PENDING_PAYMENT_VERIFICATION' ||
    payment?.payment_status === 'SUBMITTED' ||
    payment?.payment_status === 'PENDING_REVIEW';

  const expectedUpi = UPI_CONFIG.upiId;
  const detectedUpi = payment?.detected_upi_id || payment?.upi_id;
  const detectedTx = payment?.detected_transaction_id || payment?.transaction_id;
  const detectedAmt = payment?.detected_amount ?? payment?.amount;
  const hasOcr = Boolean(payment?.screenshot_analysis_status === 'ANALYZED' || payment?.ocr_confidence);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-xl">
              <Box className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white font-mono">{order.order_number}</h2>
                <StatusBadge status={order.order_status} type="order" size="sm" />
                {payment?.payment_status && (
                  <StatusBadge status={payment.payment_status} type="payment" size="sm" />
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-neutral-400">
                Created on {new Date(order.created_at).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1 text-slate-800 dark:text-neutral-200">
          {/* Quick Action Verification Banner if Pending */}
          {isPendingVerification && (
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <h4 className="font-semibold text-cyan-200">Payment Verification Required</h4>
                  <p className="text-neutral-400 text-[11px]">
                    Compare the extracted screenshot details with the customer upload and your bank record before approving.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <button
                  onClick={() => setConfirmAction('verify')}
                  className="flex-1 lg:flex-initial px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verify Payment
                </button>
                <button
                  onClick={() => setConfirmAction('flag')}
                  className="flex-1 lg:flex-initial px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Flag for Review
                </button>
                <button
                  onClick={() => setConfirmAction('reject')}
                  className="flex-1 lg:flex-initial px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Confirmation Action Form inside Modal */}
          {confirmAction && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 space-y-3 animate-in fade-in">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                {confirmAction === 'verify' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {confirmAction === 'flag' && <Flag className="w-4 h-4 text-purple-400" />}
                {confirmAction === 'reject' && <XCircle className="w-4 h-4 text-rose-400" />}
                {confirmAction === 'verify'
                  ? 'Confirm Payment Verification & Approve Order'
                  : confirmAction === 'flag'
                  ? 'Flag Payment for Manual Review'
                  : 'Reject Payment Proof'}
              </h4>

              <p className="text-slate-600 dark:text-neutral-400 text-xs">
                {confirmAction === 'verify'
                  ? `Confirm that you received ₹${order.total_amount} in your UPI bank account for Transaction ID '${detectedTx || 'N/A'}'. This will move the order to PAYMENT_VERIFIED.`
                  : confirmAction === 'flag'
                  ? 'Mark this payment as needing further investigation. Add an admin note below.'
                  : 'Rejecting this proof will cancel the order and mark payment as REJECTED.'}
              </p>

              <div>
                <label className="text-[11px] font-mono text-slate-600 dark:text-neutral-400 block mb-1">
                  Admin Note / Reason (Optional):
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    confirmAction === 'reject'
                      ? 'e.g., Fake UTR / Amount not credited in account'
                      : 'e.g., Verified in HDFC bank app at 10:15 AM'
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleVerifyConfirm(
                      confirmAction === 'verify'
                        ? 'VERIFIED'
                        : confirmAction === 'flag'
                        ? 'PENDING_REVIEW'
                        : 'REJECTED'
                    )
                  }
                  disabled={isProcessing}
                  className={`px-4 py-1.5 font-semibold rounded-lg text-white ${
                    confirmAction === 'verify'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : confirmAction === 'flag'
                      ? 'bg-purple-600 hover:bg-purple-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isProcessing
                    ? 'Updating...'
                    : confirmAction === 'verify'
                    ? 'Yes, Verify & Accept'
                    : confirmAction === 'flag'
                    ? 'Save as Flagged'
                    : 'Yes, Reject Payment'}
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT PROOF VERIFICATION INSPECTOR SECTION */}
          <div className="bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider text-slate-900 dark:text-white font-bold">
                  Payment Proof Verification Inspector
                </h3>
              </div>
              {hasOcr && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 text-[10px] font-mono">
                  Match Confidence: {Math.round((payment?.ocr_confidence || 0.9) * 100)}%
                </span>
              )}
            </div>

            {/* Side-by-Side Comparison & Screenshot Preview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Screenshot Preview */}
              <div className="md:col-span-5 space-y-2">
                <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block uppercase">
                  Uploaded Payment Screenshot
                </span>
                {payment?.screenshot_url ? (
                  <div className="relative group rounded-xl border border-slate-300 dark:border-neutral-800 overflow-hidden bg-slate-100 dark:bg-black/60">
                    <img
                      src={payment.screenshot_url}
                      alt="Customer payment proof"
                      onClick={() => setShowScreenshotEnlarged(true)}
                      className="w-full max-h-56 object-contain cursor-pointer group-hover:scale-105 transition-transform duration-200"
                    />
                    <button
                      onClick={() => setShowScreenshotEnlarged(true)}
                      className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-mono text-white flex items-center gap-1 border border-neutral-700 cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" /> Enlarge Full Size
                    </button>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 text-center text-slate-400 dark:text-neutral-500 font-mono text-xs">
                    No image file uploaded.
                    <br />
                    Submitted via UTR ID only.
                  </div>
                )}
              </div>

              {/* Expected vs Detected Comparison Grid */}
              <div className="md:col-span-7 space-y-3">
                <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block uppercase">
                  Verification Field Match Checklist
                </span>

                <div className="space-y-2 text-xs">
                  {/* Field 1: UPI ID */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-neutral-400">Receiver UPI ID</span>
                      <div className="font-mono text-slate-900 dark:text-white text-xs">
                        {detectedUpi || 'Not specified'}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">Expected: {expectedUpi}</span>
                    </div>
                    {payment?.upi_match ?? true ? (
                      <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> MATCHED
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-mono font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> MISMATCH
                      </span>
                    )}
                  </div>

                  {/* Field 2: Amount Paid */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-neutral-400">Amount Paid</span>
                      <div className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-sm">
                        {formatINR(detectedAmt || order.total_amount)}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">Expected: {formatINR(order.total_amount)}</span>
                    </div>
                    {payment?.amount_match ?? true ? (
                      <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> MATCHED
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-mono font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> MISMATCH
                      </span>
                    )}
                  </div>

                  {/* Field 3: Transaction ID / UTR */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-neutral-400">Transaction ID / UTR</span>
                      <div className="font-mono text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5">
                        <span>{detectedTx || 'Not detected'}</span>
                        {detectedTx && (
                          <button
                            onClick={() => copyToClipboard(detectedTx, 'UTR')}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded text-slate-400 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-white"
                            title="Copy UTR"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {detectedTx ? (
                      <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> DETECTED
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-mono font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> MISSING
                      </span>
                    )}
                  </div>

                  {/* Field 4: Detected Payment Status */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-neutral-400">Screenshot Status</span>
                      <div className="font-mono text-slate-900 dark:text-white text-xs">
                        {payment?.detected_payment_status || 'SUCCESS'}
                      </div>
                      {payment?.payment_date && (
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                          {payment.payment_date} {payment.payment_time ? `at ${payment.payment_time}` : ''}
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold">
                      {payment?.detected_payment_status || 'SUCCESS'}
                    </span>
                  </div>
                </div>

                {/* Fraud / Duplicate Risk Warnings */}
                {payment?.is_duplicate_transaction && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-500 text-rose-800 dark:text-rose-200 flex items-start gap-2 shadow-sm">
                    <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-rose-900 dark:text-rose-100">DUPLICATE TRANSACTION DETECTED</span>
                      <span className="text-[11px] text-rose-700 dark:text-rose-300">
                        This Transaction ID was already submitted in Order {payment.duplicate_order_number || 'previous order'}. Please verify your bank statement carefully.
                      </span>
                    </div>
                  </div>
                )}

                {/* Admin notes if present */}
                {payment?.admin_notes && (
                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-slate-200 dark:border-neutral-800 text-[11px] text-slate-700 dark:text-neutral-300 shadow-sm">
                    <span className="font-mono text-slate-400 dark:text-neutral-400 uppercase text-[10px] block">Admin Review Note:</span>
                    {payment.admin_notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid Layout: Customer & 3D Product info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800/80 rounded-xl p-4 space-y-3">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-neutral-400 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Customer Information
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 dark:border-neutral-800/60 pb-1.5">
                  <span className="text-slate-500 dark:text-neutral-400">Name:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{order.customer?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-neutral-800/60 pb-1.5">
                  <span className="text-slate-500 dark:text-neutral-400">Phone:</span>
                  <a href={`tel:${order.customer?.phone}`} className="font-mono text-cyan-600 dark:text-cyan-300 hover:underline">
                    {order.customer?.phone || 'N/A'}
                  </a>
                </div>
                {order.customer?.email && (
                  <div className="flex justify-between border-b border-slate-200 dark:border-neutral-800/60 pb-1.5">
                    <span className="text-slate-500 dark:text-neutral-400">Email:</span>
                    <span className="text-slate-800 dark:text-neutral-200 truncate">{order.customer?.email}</span>
                  </div>
                )}
                {order.customer?.college && (
                  <div className="flex justify-between border-b border-slate-200 dark:border-neutral-800/60 pb-1.5">
                    <span className="text-slate-500 dark:text-neutral-400">College/Org:</span>
                    <span className="text-slate-800 dark:text-neutral-200">{order.customer?.college}</span>
                  </div>
                )}
                <div className="pt-1">
                  <span className="text-slate-500 dark:text-neutral-400 block mb-1">Delivery / Stall Address:</span>
                  <p className="text-slate-800 dark:text-neutral-200 leading-relaxed bg-white dark:bg-neutral-900 p-2 rounded-lg border border-slate-200 dark:border-neutral-800 shadow-sm">
                    {order.customer?.address}, {order.customer?.city}{' '}
                    {order.customer?.pincode ? `- ${order.customer.pincode}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Product & Customization */}
            <div className="bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800/80 rounded-xl p-4 space-y-3">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-neutral-400 font-semibold flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 3D Print Product Details
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 dark:border-neutral-800/60 pb-1.5">
                  <span className="text-slate-500 dark:text-neutral-400">Product:</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                    {order.product?.name || '3D Model'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-neutral-800/60 pb-1.5">
                  <span className="text-slate-500 dark:text-neutral-400">Quantity:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-semibold">{order.quantity} units</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-neutral-800/60 pb-1.5">
                  <span className="text-slate-500 dark:text-neutral-400">Unit Price:</span>
                  <span className="font-mono text-slate-700 dark:text-neutral-300">{formatINR(order.unit_price)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-neutral-800/60 pb-1.5 font-bold">
                  <span className="text-slate-700 dark:text-neutral-300">Total Amount:</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 text-sm">{formatINR(order.total_amount)}</span>
                </div>

                {/* Customizations */}
                {order.customization && (
                  <div className="pt-1 space-y-1 bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800 shadow-sm">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-400 uppercase">Print Customization</span>
                    {order.customization.customText && (
                      <div className="text-xs">
                        <span className="text-slate-500 dark:text-neutral-400">Text: </span>
                        <span className="font-mono text-cyan-600 dark:text-cyan-300 font-semibold">
                          {order.customization.customText}
                        </span>
                      </div>
                    )}
                    {order.customization.selectedColor && (
                      <div className="text-xs">
                        <span className="text-slate-500 dark:text-neutral-400">Color: </span>
                        <span className="text-slate-900 dark:text-white font-medium">{order.customization.selectedColor}</span>
                      </div>
                    )}
                    {order.customization.specialInstructions && (
                      <div className="text-[11px] text-slate-700 dark:text-neutral-300 mt-1">
                        <span className="text-slate-500 dark:text-neutral-400">Note: </span>
                        {order.customization.specialInstructions}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Status Stepper Actions */}
          <div className="bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800/80 rounded-xl p-5 space-y-3">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-neutral-400 font-semibold">
              3D Print Workshop Production Workflow
            </h3>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                disabled={order.order_status === 'PRINTING' || isProcessing}
                onClick={() => handleStatusChange('PRINTING')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  order.order_status === 'PRINTING'
                    ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40'
                    : 'bg-white hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 shadow-sm'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Start 3D Printing
              </button>

              <button
                disabled={order.order_status === 'READY_FOR_PICKUP' || isProcessing}
                onClick={() => handleStatusChange('READY_FOR_PICKUP')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  order.order_status === 'READY_FOR_PICKUP'
                    ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/40'
                    : 'bg-white hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 shadow-sm'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Mark Ready for Pickup
              </button>

              <button
                disabled={order.order_status === 'COMPLETED' || isProcessing}
                onClick={() => handleStatusChange('COMPLETED')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  order.order_status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                    : 'bg-white hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 shadow-sm'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Mark Completed / Delivered
              </button>

              <button
                disabled={order.order_status === 'CANCELLED' || isProcessing}
                onClick={() => handleStatusChange('CANCELLED')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  order.order_status === 'CANCELLED'
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40'
                    : 'bg-white hover:bg-rose-50 dark:bg-neutral-900 dark:hover:bg-rose-950/60 text-slate-600 hover:text-rose-700 dark:text-neutral-400 dark:hover:text-rose-300 border border-slate-300 dark:border-neutral-800 shadow-sm'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Cancel Order
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-white font-medium rounded-xl text-xs border border-slate-300 dark:border-neutral-700 cursor-pointer transition-colors shadow-sm"
          >
            Close Inspector
          </button>
        </div>
      </div>

      {/* Enlarged Screenshot Modal */}
      {showScreenshotEnlarged && payment?.screenshot_url && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setShowScreenshotEnlarged(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={payment.screenshot_url}
              alt="Payment Screenshot Full"
              className="max-h-[85vh] max-w-full rounded-xl object-contain border border-neutral-700"
            />
            <button
              onClick={() => setShowScreenshotEnlarged(false)}
              className="absolute top-2 right-2 p-2 bg-neutral-900 rounded-full text-white border border-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
