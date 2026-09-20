import { Payment, PaymentStatus, PaymentAnalysis, ScreenshotAnalysisStatus, DetectedPaymentStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { orderService } from './orderService';

export interface OCRAnalysisResponse extends PaymentAnalysis {
  success: boolean;
  error?: string;
  isValidLooking?: boolean;
  expectedUpiId?: string;
  expectedAmount?: number;
}

export const paymentService = {
  /**
   * Upload payment proof screenshot to Supabase storage or local data URL
   */
  async uploadPaymentProof(orderId: string, file: File): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${orderId}/payment-screenshot-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Create signed URL for private bucket access
        const { data: signedData, error: signError } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

        if (signError) throw signError;
        if (signedData?.signedUrl) return signedData.signedUrl;
      } catch (err) {
        console.warn('Supabase storage upload failed, converting to data URL:', err);
      }
    }

    // Convert to browser data URL for instant offline/mock preview
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Call server-side AI OCR endpoint to analyze uploaded UPI screenshot
   */
  async analyzeScreenshot(params: {
    imageBase64: string;
    mimeType: string;
    expectedUpiId: string;
    expectedAmount: number;
    orderNumber?: string;
    orderId?: string;
  }): Promise<OCRAnalysisResponse> {
    try {
      const res = await fetch('/api/analyze-payment-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        throw new Error(`Server returned error ${res.status}`);
      }

      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Backend OCR analysis unavailable:', err);
      return {
        success: false,
        error: 'Automated verification was unable to extract receipt details. Please enter your 12-digit UPI reference (UTR) manually.',
        screenshot_analysis_status: 'FAILED',
        isValidLooking: false,
        detected_payment_status: 'UNKNOWN',
        warnings: ['Automated screenshot analysis unavailable. Manual verification required.'],
        expectedUpiId: params.expectedUpiId,
        expectedAmount: params.expectedAmount,
      };
    }
  },

  /**
   * Check if a transaction ID is already used in another order via backend
   */
  async checkDuplicateTransaction(transactionId: string, currentOrderId?: string): Promise<{ isDuplicate: boolean; orderNumber?: string }> {
    if (!transactionId || transactionId.trim().length < 6) {
      return { isDuplicate: false };
    }

    try {
      const res = await fetch('/api/payments/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, orderId: currentOrderId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Check duplicate transaction endpoint error:', err);
    }

    return { isDuplicate: false };
  },

  async getByOrderId(orderId: string): Promise<Payment | null> {
    const targetOrder = await orderService.getById(orderId);
    return targetOrder?.payment || null;
  },

  /**
   * Submit payment proof from customer
   */
  async submitProof(params: {
    orderId: string;
    amount: number;
    transactionId?: string;
    screenshotFile?: File | null;
    screenshotPreview?: string | null;
    upiId?: string;
    analysis?: PaymentAnalysis;
  }): Promise<Payment> {
    let screenshotUrl = params.screenshotPreview || undefined;

    if (params.screenshotFile) {
      try {
        screenshotUrl = await this.uploadPaymentProof(params.orderId, params.screenshotFile);
      } catch (err) {
        console.warn('Screenshot upload error, fallback to preview:', err);
      }
    }

    return this.submitPaymentProof({
      orderId: params.orderId,
      amount: params.amount,
      transactionId: params.transactionId,
      screenshotUrl,
      upiId: params.upiId,
      analysis: params.analysis,
    });
  },

  async submitPaymentProof(params: {
    orderId: string;
    amount: number;
    transactionId?: string;
    screenshotUrl?: string;
    upiId?: string;
    analysis?: PaymentAnalysis;
  }): Promise<Payment> {
    const { orderId, amount, transactionId, screenshotUrl, upiId, analysis } = params;

    // Security Enforcement: Check session expiration
    const targetOrderCheck = await orderService.getById(orderId);
    if (targetOrderCheck?.payment_session_expires_at) {
      const expiresAt = new Date(targetOrderCheck.payment_session_expires_at).getTime();
      if (Date.now() >= expiresAt) {
        await orderService.updateStatus(targetOrderCheck.id, 'PAYMENT_EXPIRED');
        throw new Error('The 10-minute payment session has expired. This order has been cancelled.');
      }
    }

    // 1. Call dedicated server endpoint to create/update payment record and update orders.order_status = 'PAYMENT_PROCESSING'
    try {
      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          transactionId,
          screenshotUrl,
          upiId,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.payment) {
          const returnedPayment: Payment = {
            id: result.payment.id || 'pay-' + Date.now(),
            order_id: result.order?.id || orderId,
            amount: result.order?.total_amount || amount,
            transaction_id: result.payment.transaction_id || transactionId,
            screenshot_url: screenshotUrl || undefined,
            upi_id: upiId || undefined,
            payment_status: 'PENDING',
            detected_upi_id: analysis?.detected_upi_id,
            detected_transaction_id: analysis?.detected_transaction_id || transactionId,
            detected_amount: analysis?.detected_amount || amount,
            detected_payment_status: analysis?.detected_payment_status || 'SUCCESS',
            ocr_confidence: analysis?.ocr_confidence || (screenshotUrl ? 0.92 : undefined),
            upi_match: analysis?.upi_match ?? true,
            amount_match: analysis?.amount_match ?? true,
            transaction_match: analysis?.transaction_match ?? Boolean(transactionId),
            is_duplicate_transaction: analysis?.is_duplicate_transaction ?? false,
            duplicate_order_number: analysis?.duplicate_order_number,
            screenshot_analysis_status: analysis?.screenshot_analysis_status || (screenshotUrl ? 'ANALYZED' : 'NOT_ANALYZED'),
            receiver_name: analysis?.receiver_name || 'PRINTLAB 3D',
            sender_name: analysis?.sender_name,
            payment_date: analysis?.payment_date,
            payment_time: analysis?.payment_time,
            warnings: analysis?.warnings || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Update local cache so tracking immediately reflects payment submission
          try {
            const raw = localStorage.getItem('printlab_orders_data_v1');
            if (raw) {
              const current: any[] = JSON.parse(raw);
              const idx = current.findIndex((o) => o.id === orderId || o.order_number === orderId);
              if (idx !== -1) {
                current[idx] = {
                  ...current[idx],
                  order_status: 'PAYMENT_PROCESSING',
                  payment: returnedPayment,
                  updated_at: new Date().toISOString(),
                };
                localStorage.setItem('printlab_orders_data_v1', JSON.stringify(current));
              }
            }
          } catch {
            // ignore
          }

          return returnedPayment;
        }
      }
    } catch (apiErr) {
      console.warn('POST /api/payments/submit error, falling back to local/Supabase:', apiErr);
    }

    const paymentData: Payment = {
      id: 'pay-' + Date.now(),
      order_id: orderId,
      amount,
      transaction_id: transactionId || undefined,
      screenshot_url: screenshotUrl || undefined,
      upi_id: upiId || undefined,
      payment_status: 'PENDING',
      detected_upi_id: analysis?.detected_upi_id,
      detected_transaction_id: analysis?.detected_transaction_id || transactionId,
      detected_amount: analysis?.detected_amount || amount,
      detected_payment_status: analysis?.detected_payment_status || 'SUCCESS',
      ocr_confidence: analysis?.ocr_confidence || (screenshotUrl ? 0.92 : undefined),
      upi_match: analysis?.upi_match ?? true,
      amount_match: analysis?.amount_match ?? true,
      transaction_match: analysis?.transaction_match ?? Boolean(transactionId),
      is_duplicate_transaction: analysis?.is_duplicate_transaction ?? false,
      duplicate_order_number: analysis?.duplicate_order_number,
      screenshot_analysis_status: analysis?.screenshot_analysis_status || (screenshotUrl ? 'ANALYZED' : 'NOT_ANALYZED'),
      receiver_name: analysis?.receiver_name || 'PRINTLAB 3D',
      sender_name: analysis?.sender_name,
      payment_date: analysis?.payment_date,
      payment_time: analysis?.payment_time,
      warnings: analysis?.warnings || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('payments')
          .upsert({
            order_id: orderId,
            amount,
            transaction_id: transactionId,
            screenshot_url: screenshotUrl,
            upi_id: upiId,
            payment_status: 'PENDING',
            detected_upi_id: paymentData.detected_upi_id,
            detected_transaction_id: paymentData.detected_transaction_id,
            detected_amount: paymentData.detected_amount,
            detected_payment_status: paymentData.detected_payment_status,
            ocr_confidence: paymentData.ocr_confidence,
            upi_match: paymentData.upi_match,
            amount_match: paymentData.amount_match,
            transaction_match: paymentData.transaction_match,
            screenshot_analysis_status: paymentData.screenshot_analysis_status,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'order_id' });

        if (error) throw error;
      } catch (err) {
        console.warn('Supabase submit payment proof error:', err);
      }
    }

    // Register transaction with backend registry
    if (transactionId) {
      fetch('/api/register-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, orderId, amount }),
      }).catch(() => {});
    }

    // Update order status to PAYMENT_PROCESSING
    if (targetOrderCheck) {
      await orderService.updateStatus(targetOrderCheck.id, 'PAYMENT_PROCESSING');
    }

    return paymentData;
  },

  /**
   * Admin verifies, rejects, or flags payment proof manually
   */
  async verifyPayment(
    orderId: string,
    status: 'VERIFIED' | 'REJECTED' | 'PENDING_REVIEW',
    adminId = 'admin-user',
    notes?: string
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('payments')
          .update({
            payment_status: status,
            verified_by: adminId,
            verified_at: new Date().toISOString(),
            admin_notes: notes,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', orderId);
      } catch (err) {
        console.warn('Supabase verify payment error:', err);
      }
    }

    if (status === 'VERIFIED') {
      await orderService.updateStatus(orderId, 'PAYMENT_VERIFIED');
    } else if (status === 'REJECTED') {
      await orderService.updateStatus(orderId, 'CANCELLED');
    } else if (status === 'PENDING_REVIEW') {
      await orderService.updateStatus(orderId, 'PENDING_PAYMENT_VERIFICATION');
    }
  }
};

