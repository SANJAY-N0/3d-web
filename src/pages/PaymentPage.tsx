import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { StepProgress } from '../components/common/StepProgress';
import { UPIQRCodeDisplay } from '../components/order/UPIQRCodeDisplay';
import { OrderSummaryCard } from '../components/order/OrderSummaryCard';
import { CustomerSupportCard } from '../components/common/CustomerSupportCard';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { getMerchantUPIConfig } from '../lib/upiUtils';
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
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const PaymentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId: paramOrderId } = useParams<{ orderId?: string }>();
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

  const searchParams = new URLSearchParams(location.search);
  const queryOrderId = searchParams.get('orderId') || searchParams.get('order');

  // Multi-tier order ID resolution: param -> query -> router state -> storage
  const resolvedOrderId =
    paramOrderId ||
    queryOrderId ||
    stateData?.orderId ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem('printlab_last_order_id') || localStorage.getItem('printlab_last_order_id')
      : null);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 10-Minute Payment Session Countdown State
  const [timeLeft, setTimeLeft] = useState<number>(600);

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

  useEffect(() => {
    window.scrollTo(0, 0);

    let isMounted = true;
    console.log('Payment order ID:', resolvedOrderId);

    // 10-second timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
        setFetchError('Unable to load payment details. Please check your connection or try again.');
      }
    }, 10000);

    const loadOrderData = async () => {
      if (!resolvedOrderId) {
        if (isMounted) {
          setLoading(false);
          setFetchError('Payment session could not be found. Please create a new order.');
        }
        return;
      }

      try {
        // Fast hydration: if stateData contains product details, initialize immediate preview
        if (stateData && stateData.orderId === resolvedOrderId && stateData.product) {
          const previewOrder: Order = {
            id: stateData.orderId,
            order_number: stateData.orderNumber || 'PENDING',
            customer_id: stateData.customer?.id || '',
            product_id: stateData.product.id,
            quantity: stateData.product.quantity || 1,
            unit_price: stateData.product.price,
            total_amount: stateData.totalAmount || stateData.product.price,
            customization: stateData.customization,
            order_status: 'PENDING_PAYMENT',
            payment_session_created_at: new Date().toISOString(),
            payment_session_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            product: stateData.product,
            customer: stateData.customer,
          };
          if (isMounted) {
            setOrder(previewOrder);
          }
        }

        // Fetch verified order data and ensure active 10-minute session from server
        const currentOrder = await orderService.ensurePaymentSession(resolvedOrderId);

        if (!isMounted) return;

        if (currentOrder) {
          setOrder(currentOrder);
          setFetchError(null);

          // Store active order ID for refresh resilience
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('printlab_last_order_id', currentOrder.id);
              localStorage.setItem('printlab_last_order_id', currentOrder.id);
            } catch {
              // ignore
            }
          }

          // Compute remaining seconds from database payment_session_expires_at
          if (currentOrder.payment_session_expires_at) {
            const remaining = Math.max(
              0,
              Math.floor((new Date(currentOrder.payment_session_expires_at).getTime() - Date.now()) / 1000)
            );
            setTimeLeft(remaining);
          }
        } else {
          // If no order returned and no fast preview available
          if (!order && !stateData?.product) {
            setFetchError('Payment session could not be found. Please create a new order.');
          }
        }
      } catch (err: any) {
        console.error('Payment page error:', err);
        if (isMounted) {
          setFetchError(err?.message || 'Unable to load payment details. Please try again.');
        }
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    loadOrderData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [resolvedOrderId]);

  // Active 1-second countdown ticker
  useEffect(() => {
    if (!order?.payment_session_expires_at) return;

    const expiresTime = new Date(order.payment_session_expires_at).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      // Trigger expiration when countdown hits 0
      if (remaining <= 0 && order.order_status !== 'PAYMENT_EXPIRED') {
        orderService.expirePaymentSession(order.id);
        setOrder((prev) => (prev ? { ...prev, order_status: 'PAYMENT_EXPIRED' } : null));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order?.payment_session_expires_at, order?.id, order?.order_status]);

  // STATE 1: LOADING STATE
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">Loading payment details...</span>
        </div>
      </div>
    );
  }

  // STATE 2: ERROR STATE (Order not found, invalid session, or timeout)
  if (fetchError || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
            Payment Session Error
          </h2>
          <p className="text-sm text-slate-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
            {fetchError || 'Payment session could not be found. Please create a new order.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/products"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Order</span>
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // STATE 3: ACTIVE OR EXPIRED PAYMENT SESSION

  // Check if session has expired
  const isSessionExpired =
    order.order_status === 'PAYMENT_EXPIRED' ||
    (order.payment_session_expires_at && new Date(order.payment_session_expires_at).getTime() <= Date.now()) ||
    timeLeft <= 0;

  // Format MM:SS
  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Handle image selection (from Upload Screenshot or Take Photo)
  const handleSelectImage = (file: File) => {
    if (isSessionExpired) return;
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
    if (isSessionExpired) {
      setErrorMessage('The 10-minute payment session has expired. This order is cancelled.');
      return;
    }

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

    // Optional screenshot validation
    if (screenshotFile) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(screenshotFile.type.toLowerCase())) {
        setErrorMessage('Unsupported screenshot format. Please use JPG, JPEG, PNG, or WebP.');
        return;
      }
    }

    setIsSubmitting(true);
    setUploadStep('Verifying payment session...');

    try {
      // Backend Enforcement: Verify session on server before accepting payment
      const verifyRes = await fetch('/api/payments/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          expiresAt: order.payment_session_expires_at,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.valid) {
        await orderService.expirePaymentSession(order.id);
        setOrder((prev) => (prev ? { ...prev, order_status: 'PAYMENT_EXPIRED' } : null));
        throw new Error(verifyData.error || 'Payment session has expired. This order has been cancelled.');
      }

      let uploadedScreenshotUrl: string | undefined = undefined;

      // 2. Upload screenshot if provided
      if (screenshotFile) {
        setUploadStep('Uploading payment screenshot...');
        try {
          uploadedScreenshotUrl = await paymentService.uploadPaymentProof(order.id, screenshotFile);
        } catch (uploadErr) {
          console.warn('Screenshot upload fallback:', uploadErr);
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
        upiId: getMerchantUPIConfig().upiId,
      });

      // 4. Update order status to PENDING_PAYMENT_VERIFICATION
      await orderService.updateStatus(order.id, 'PENDING_PAYMENT_VERIFICATION');

      showToast('Payment submitted successfully! Verification in progress.', 'success');

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
      showToast(err?.message || 'Payment submission failed. Please try again.', 'error');
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
        {/* Left Column: Payment Session / Controls */}
        <div className="lg:col-span-7 space-y-6">
          {isSessionExpired ? (
            /* ======================================================== */
            /* 4. EXPIRED PAYMENT UI                                   */
            /* ======================================================== */
            <div className="bg-white dark:bg-neutral-900/95 border-2 border-rose-300 dark:border-rose-900/60 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-2.5">
                <span className="text-xs uppercase font-mono tracking-widest text-rose-500 font-bold block">
                  Session Timeout
                </span>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                  Payment Session Expired
                </h2>
                <div className="text-sm text-slate-600 dark:text-neutral-300 max-w-md mx-auto leading-relaxed space-y-1">
                  <p>The 10-minute payment window has expired.</p>
                  <p className="font-semibold text-rose-600 dark:text-rose-400">This order has been cancelled.</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400 pt-1">
                  Please create a new order to try again.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to={order.product ? `/order?product=${order.product.slug || order.product.id}` : '/products'}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-xl shadow-cyan-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Order</span>
                </Link>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* ACTIVE PAYMENT SESSION CONTROLS                         */
            /* ======================================================== */
            <div className="space-y-6">
              {/* 1. Payment Session Timer Banner */}
              <div className="bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${timeLeft < 120 ? 'bg-rose-500/10 text-rose-500' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'}`}>
                    <Clock className={`w-5 h-5 ${timeLeft < 120 ? 'animate-bounce' : 'animate-pulse'}`} />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 dark:text-neutral-400 font-semibold block">
                      Payment Session
                    </span>
                    <p className="text-xs text-slate-700 dark:text-neutral-300">
                      Complete your payment within:
                    </p>
                  </div>
                </div>

                <div className={`font-mono font-bold text-2xl sm:text-3xl tracking-widest px-4 py-1.5 rounded-xl border text-center ${
                  timeLeft < 120
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/30 animate-pulse'
                    : 'bg-slate-50 dark:bg-neutral-950 text-cyan-700 dark:text-cyan-400 border-slate-200 dark:border-neutral-800'
                }`}>
                  {formatCountdown(timeLeft)}
                </div>
              </div>

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
                  <span>Payment Verification</span>
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
                      <span>Verifying & Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify Payment & Track Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary, Customer Support & Guide */}
        <div className="lg:col-span-5 space-y-6">
          {order.product && (
            <OrderSummaryCard
              product={order.product}
              quantity={order.quantity}
              customization={order.customization}
              customer={order.customer}
            />
          )}

          {/* Customer Support Card (PART 3) */}
          <CustomerSupportCard orderNumber={order.order_number} />

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
