import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  DollarSign,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Upload,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { PosCartItem, PaymentMethod } from '../../types';
import { formatINR } from '../../lib/upiUtils';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { useToast } from '../common/Toast';

interface POSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: PosCartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  customerName: string;
  customerMobile: string;
  onCompleteBill: (paymentData: {
    payment_method: PaymentMethod;
    cash_received?: number;
    change_amount?: number;
    transaction_id?: string;
    payment_screenshot_url?: string;
    notes?: string;
  }) => Promise<void>;
  loading: boolean;
}

export const POSPaymentModal: React.FC<POSPaymentModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  discount,
  tax,
  totalAmount,
  customerName,
  customerMobile,
  onCompleteBill,
  loading,
}) => {
  const { showToast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(totalAmount);
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [notes, setNotes] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const UPI_ID = 'printlab3d@okhdfcbank';

  // Reset cash received to match totalAmount when modal opens or total changes
  useEffect(() => {
    if (isOpen) {
      setCashReceived(totalAmount);
      setTransactionId('');
      setScreenshotUrl(null);
      setNotes('');
    }
  }, [isOpen, totalAmount]);

  if (!isOpen) return null;

  const changeAmount = Math.max(0, cashReceived - totalAmount);
  const isCashInsufficient = paymentMethod === 'CASH' && cashReceived < totalAmount;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    showToast('UPI ID copied to clipboard.', 'info');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingScreenshot(true);
    try {
      const res = await uploadToCloudinary({
        file,
        folder: '3d-printing/pos-payments',
      });
      if (res.secure_url || res.url) {
        setScreenshotUrl(res.secure_url || res.url);
        showToast('Payment screenshot uploaded successfully.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload screenshot.', 'error');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'CASH') {
      if (cashReceived < totalAmount) {
        showToast(`Cash received (₹${cashReceived}) is less than total amount (₹${totalAmount}).`, 'error');
        return;
      }
    } else if (paymentMethod === 'UPI') {
      if (!transactionId.trim()) {
        showToast('Please enter the UPI Transaction ID / UTR number.', 'error');
        return;
      }
    }

    await onCompleteBill({
      payment_method: paymentMethod,
      cash_received: paymentMethod === 'CASH' ? cashReceived : undefined,
      change_amount: paymentMethod === 'CASH' ? changeAmount : undefined,
      transaction_id: transactionId.trim() || undefined,
      payment_screenshot_url: screenshotUrl || undefined,
      notes: notes.trim() || undefined,
    });
  };

  // Quick cash amounts
  const quickCashOptions = [
    totalAmount,
    Math.ceil(totalAmount / 50) * 50 > totalAmount ? Math.ceil(totalAmount / 50) * 50 : totalAmount + 50,
    Math.ceil(totalAmount / 100) * 100 > totalAmount ? Math.ceil(totalAmount / 100) * 100 : totalAmount + 100,
    500 > totalAmount ? 500 : 1000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= totalAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Confirm Billing</h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                {customerName || 'Walk-in Customer'} • {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Amount Overview Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent border border-cyan-200 dark:border-cyan-900/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400 block">
                Total Payable
              </span>
              <span className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
                {formatINR(totalAmount)}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-500 dark:text-neutral-400 space-y-0.5 font-mono">
              <div>Subtotal: {formatINR(subtotal)}</div>
              {discount > 0 && <div className="text-emerald-600">Discount: -{formatINR(discount)}</div>}
              {tax > 0 && <div>Tax: +{formatINR(tax)}</div>}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-neutral-300 font-mono text-[11px] uppercase tracking-wider">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/60 text-slate-600 dark:text-neutral-400'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>CASH</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition-all cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/60 text-slate-600 dark:text-neutral-400'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ONLINE')}
                className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition-all cursor-pointer ${
                  paymentMethod === 'ONLINE'
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 shadow-sm'
                    : 'border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/60 text-slate-600 dark:text-neutral-400'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>ONLINE</span>
              </button>
            </div>
          </div>

          {/* CASH PAYMENT UI */}
          {paymentMethod === 'CASH' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-neutral-300 flex items-center justify-between">
                  <span>Cash Received from Customer</span>
                  <span className="font-mono text-slate-400">₹ INR</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                  placeholder="Enter cash amount"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-base font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-mono">Quick:</span>
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCashReceived(opt)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 hover:border-amber-500 text-slate-700 dark:text-neutral-300 text-[11px] font-mono cursor-pointer transition-colors"
                  >
                    {formatINR(opt)}
                  </button>
                ))}
              </div>

              {/* Change Return Calculation */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between font-mono font-bold text-xs ${
                  isCashInsufficient
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <span>{isCashInsufficient ? 'Insufficient Cash:' : 'Change to Return:'}</span>
                <span className="text-sm">
                  {isCashInsufficient
                    ? `- ${formatINR(totalAmount - cashReceived)}`
                    : formatINR(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* UPI PAYMENT UI */}
          {paymentMethod === 'UPI' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-3">
              {/* UPI ID banner */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block">Merchant UPI ID:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">{UPI_ID}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 hover:text-cyan-500 transition-colors cursor-pointer"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Transaction ID input */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-neutral-300 font-mono text-[11px]">
                  UPI Ref / UTR / Transaction ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 426812345678"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Screenshot proof upload */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-neutral-300 font-mono text-[11px]">
                  Payment Screenshot (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-dashed border-slate-300 dark:border-neutral-700 hover:border-indigo-500 text-slate-600 dark:text-neutral-400 cursor-pointer flex items-center gap-1.5 text-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingScreenshot ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      disabled={uploadingScreenshot}
                      className="hidden"
                    />
                  </label>
                  {screenshotUrl && (
                    <a
                      href={screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-500 hover:underline truncate max-w-[200px]"
                    >
                      View uploaded screenshot
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ONLINE PAYMENT UI */}
          {paymentMethod === 'ONLINE' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-neutral-300 font-mono text-[11px]">
                  Online Reference / Card Approval Code
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. CARD-AUTH-7788"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-neutral-300 font-mono text-[11px]">
              Notes / Special Instructions (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Priority packaging, customer picked in store..."
              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || isCashInsufficient || (paymentMethod === 'UPI' && !transactionId.trim())}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 uppercase text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {loading
                  ? 'Processing...'
                  : paymentMethod === 'UPI'
                  ? 'VERIFY & COMPLETE'
                  : 'COMPLETE BILL'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
