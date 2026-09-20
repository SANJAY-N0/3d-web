import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { StepProgress } from '../components/common/StepProgress';
import { PaymentProofForm } from '../components/order/PaymentProofForm';
import { OrderSummaryCard } from '../components/order/OrderSummaryCard';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { Order } from '../types';
import { useToast } from '../components/common/Toast';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const PaymentVerification: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const stateData = location.state as {
    orderId?: string;
    orderNumber?: string;
    totalAmount?: number;
    product?: any;
    customer?: any;
  } | undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stateOrderId = stateData?.orderId;

  useEffect(() => {
    window.scrollTo(0, 0);

    const loadOrder = async () => {
      if (stateOrderId) {
        const found = await orderService.getById(stateOrderId);
        if (found) {
          setOrder(found);
          setLoading(false);
          return;
        }
      }

      // Fallback
      const allOrders = await orderService.getAll();
      if (allOrders.length > 0) {
        setOrder(allOrders[0]);
      }
      setLoading(false);
    };

    loadOrder();
  }, [stateOrderId]);

  if (loading || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSubmitProof = async (data: {
    transactionId: string;
    screenshotFile: File | null;
    screenshotPreview: string | null;
    analysis?: any;
  }) => {
    setIsSubmitting(true);
    try {
      // 1. Submit payment proof for verification
      await paymentService.submitProof({
        orderId: order.id,
        amount: order.total_amount,
        transactionId: data.transactionId || undefined,
        screenshotFile: data.screenshotFile || undefined,
        screenshotPreview: data.screenshotPreview || undefined,
        analysis: data.analysis,
      });

      showToast('Payment proof submitted! Order awaiting admin verification.', 'success');

      // 2. Navigate to Success page
      navigate(`/order-success/${order.id}`, {
        state: {
          orderId: order.id,
          orderNumber: order.order_number,
          totalAmount: order.total_amount,
          transactionId: data.transactionId,
          product: order.product,
          customer: order.customer,
        },
      });
    } catch (err: any) {
      console.error('Payment submission error:', err);
      showToast(err.message || 'Failed to submit payment proof.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Step Progress */}
      <StepProgress currentStep="verify" />

      {/* Back to QR Code */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to UPI QR Code
        </button>

        <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold">Order: {order.order_number}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Proof submission form */}
        <div className="lg:col-span-7 space-y-6">
          <PaymentProofForm
            amount={order.total_amount}
            orderNumber={order.order_number}
            orderId={order.id}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitProof}
          />
        </div>

        {/* Right Col: Summary */}
        <div className="lg:col-span-5 space-y-6">
          {order.product && (
            <OrderSummaryCard
              product={order.product}
              quantity={order.quantity}
              customization={order.customization}
              customer={order.customer}
            />
          )}

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 text-xs text-slate-600 dark:text-neutral-400 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold font-mono text-[11px] uppercase">
              <ShieldCheck className="w-3.5 h-3.5" /> What happens next?
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-neutral-400">
              Once submitted, our stall admin receives real-time notification to verify your transaction and prepare your custom 3D model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
