import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { StepProgress } from '../components/common/StepProgress';
import { UPIQRCodeDisplay } from '../components/order/UPIQRCodeDisplay';
import { OrderSummaryCard } from '../components/order/OrderSummaryCard';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { Order } from '../types';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Camera,
  X,
  AlertCircle,
  Hash,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const PaymentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const stateData = location.state as
    | {
        orderId?: string;
        orderNumber?: string;
        totalAmount?: number;
        productName?: string;
        product?: any;
        customer?: any;
        customization?: any;
      }
    | undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // UTR / Transaction ID (Must NOT be autofilled - customer enters manually)
  const [transactionId, setTransactionId] = useState('');

  // Payment Screenshot state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Form submission & progress state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File input refs for Upload vs Take Photo
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const stateOrderId = stateData?.orderId;

  useEffect(() => {
    window.scrollTo(0, 0);

    const loadOrderData = async () => {
      if (stateOrderId) {
        const found = await orderService.getById(stateOrderId);
        if (found) {
          setOrder(found);
          setLoading(false);
          return;
        }
      }

      // If no state passed (e.g. direct refresh), fetch latest order
      const allOrders = await orderService.getAll();
      if (allOrders.length > 0) {
        setOrder(allOrders[0]);
      }
      setLoading(false);
    };

    loadOrderData();
  }, [stateOrderId]);

  if (loading || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">Loading payment details...</span>
        </div>
      </div>
    );
  }

  // Handle image selection (from Upload Screenshot or Take Photo)
  const handleSelectImage = (file: File) => {
    setErrorMessage(null);

    // Validate format (JPG, JPEG, PNG, WebP)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Unsupported format. Please upload a JPG, JPEG, PNG, or WebP screenshot.');
      return;
    }

    // Validate size (max 10MB)
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage('Screenshot file size exceeds 10 MB limit. Please select a smaller image.');
      return;
    }

    setScreenshotFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileUploadInputRef.current) fileUploadInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTx = transactionId.trim();

    // 1. Validate UTR / Transaction ID (Mandatory, customer enters manually)
    if (!trimmedTx) {
      setErrorMessage('Please enter the UPI Transaction ID / UTR from your payment app.');
      return;
    }

    if (trimmedTx.length < 6) {
      setErrorMessage('UPI Transaction ID / UTR must be at least 6 characters.');
      return;
    }

    // Optional screenshot validation: If user selected an invalid file
    if (screenshotFile) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(screenshotFile.type.toLowerCase())) {
        setErrorMessage('Unsupported screenshot format. Please use JPG, JPEG, PNG, or WebP.');
        return;
      }
    }

    setIsSubmitting(true);
    setUploadStep('Validating payment details...');

    try {
      let uploadedScreenshotUrl: string | undefined = undefined;

      // 2. Upload screenshot if provided
      if (screenshotFile) {
        setUploadStep('Uploading payment screenshot...');
        try {
          uploadedScreenshotUrl = await paymentService.uploadPaymentProof(order.id, screenshotFile);
        } catch (uploadErr) {
          console.warn('Screenshot upload fallback:', uploadErr);
          // Use base64 preview if cloud upload encounters a network issue
          uploadedScreenshotUrl = screenshotPreview || undefined;
        }
      }

      // 3. Submit payment details
      setUploadStep('Confirming order payment...');
      await paymentService.submitPaymentProof({
        orderId: order.id,
        amount: order.total_amount,
        transactionId: trimmedTx,
        screenshotUrl: uploadedScreenshotUrl,
        upiId: 'printlab3d@okhdfcbank',
      });

      // 4. Update order status
      await orderService.updateStatus(order.id, 'PAYMENT_CONFIRMED');

      showToast('Payment submitted successfully! Your order is now in queue.', 'success');

      // 5. Navigate to Order Tracking
      navigate(`/track?order=${order.order_number}`, {
        state: {
          orderId: order.id,
          orderNumber: order.order_number,
        },
      });
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      setErrorMessage(err?.message || 'Failed to submit payment. Please verify your details and try again.');
      showToast('Payment submission failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
      setUploadStep('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Step Progress */}
      <StepProgress currentStep="payment" />

      {/* Back to Products */}
      <div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Back to Products
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: UPI QR Code & Payment Confirmation */}
        <div className="lg:col-span-7 space-y-6">
          {/* UPI QR Display */}
          <UPIQRCodeDisplay
            amount={order.total_amount}
            orderNumber={order.order_number}
            productName={order.product?.name || '3D Print Model'}
          />

          {/* Payment Confirmation Form */}
          <form
            onSubmit={handleConfirmPayment}
            className="bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm dark:shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Payment Confirmation</span>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Payment Screenshot Upload */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-800 dark:text-neutral-200 font-sans">
                Payment Screenshot
              </label>

              {!screenshotPreview ? (
                <div className="space-y-3">
                  {/* Upload Screenshot / Take Photo buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileUploadInputRef.current?.click()}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Upload Screenshot</span>
                    </button>

                    <span className="text-xs font-medium text-slate-400 dark:text-neutral-500 font-mono lowercase">
                      or
                    </span>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Take Photo</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 text-center sm:text-left">
                    Accepts JPG, JPEG, PNG, or WebP (max 10MB).
                  </p>

                  {/* Hidden file input for standard file picker */}
                  <input
                    ref={fileUploadInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSelectImage(f);
                    }}
                    className="hidden"
                  />

                  {/* Hidden file input with camera capture for mobile */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    capture="environment"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSelectImage(f);
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                /* Screenshot Preview Card */
                <div className="relative rounded-2xl border border-cyan-500/40 bg-slate-50 dark:bg-neutral-950 p-3.5 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={screenshotPreview}
                      alt="Payment screenshot preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-neutral-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                        {screenshotFile?.name || 'Payment_Screenshot.jpg'}
                      </span>
                      {screenshotFile && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block">
                          {(screenshotFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      )}
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" /> Ready to upload
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveScreenshot}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Remove Screenshot"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 2. Transaction ID Input (No Autofill) */}
            <div className="space-y-1.5">
              <label htmlFor="transaction-id-input" className="block text-xs font-semibold text-slate-800 dark:text-neutral-200 font-sans">
                UPI Transaction ID / UTR <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="transaction-id-input"
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter Transaction ID"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Enter the 12-digit UTR or Transaction ID shown in Google Pay, PhonePe, Paytm, or BHIM after payment.
              </p>
            </div>

            {/* Upload progress indicator */}
            {isSubmitting && uploadStep && (
              <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/30 text-xs font-mono text-cyan-700 dark:text-cyan-300 flex items-center gap-2 animate-in fade-in">
                <div className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>{uploadStep}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Payment & Track Order</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Order Summary & Help */}
        <div className="lg:col-span-5 space-y-6">
          {order.product && (
            <OrderSummaryCard
              product={order.product}
              quantity={order.quantity}
              customization={order.customization}
              customer={order.customer}
            />
          )}

          {/* Where to find UTR guide */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 text-xs text-slate-600 dark:text-neutral-400 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300 font-semibold font-mono text-xs">
              <Hash className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Where to find UTR / Transaction ID?</span>
            </div>
            <ul className="text-[11px] leading-relaxed text-slate-500 dark:text-neutral-400 space-y-1.5 list-disc list-inside">
              <li><strong className="text-slate-700 dark:text-neutral-300">Google Pay:</strong> Open payment &rarr; Look for "UPI transaction ID" (12 digits).</li>
              <li><strong className="text-slate-700 dark:text-neutral-300">PhonePe:</strong> Open transaction history &rarr; Check "UTR".</li>
              <li><strong className="text-slate-700 dark:text-neutral-300">Paytm:</strong> View passbook receipt &rarr; Check "UPI Ref No.".</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
