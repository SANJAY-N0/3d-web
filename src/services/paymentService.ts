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
   * Call server-side verification endpoint to analyze uploaded UPI screenshot
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

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data) {
        throw new Error(`Server returned error ${res.status}`);
      }

      return data;
    } catch (err: any) {
      console.warn('Backend verification scan unavailable:', err);
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
   * Check if a transaction ID is already used in another order via backend or Supabase
   */
  async checkDuplicateTransaction(transactionId: string, currentOrderId?: string): Promise<{ isDuplicate: boolean; orderNumber?: string }> {
    if (!transactionId || transactionId.trim().length < 6) {
      return { isDuplicate: false };
    }

    const cleanTx = transactionId.trim().toUpperCase();

    // 1. Try server API with safe JSON parsing
    try {
      const res = await fetch('/api/payments/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: cleanTx, orderId: currentOrderId }),
      });
      if (res.ok) {
        const text = await res.text();
        try {
          const json = text ? JSON.parse(text) : null;
          if (json && typeof json.isDuplicate === 'boolean') {
            return json;
          }
        } catch {
          // Ignore parse errors on fallback
        }
      }
    } catch (err) {
      console.warn('Check duplicate transaction endpoint error:', err);
    }

    // 2. Direct Supabase query fallback
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('payments')
          .select('id, transaction_id, order_id, orders:order_id(id, order_number)')
          .ilike('transaction_id', cleanTx);

        if (currentOrderId) {
          query = query.neq('order_id', currentOrderId);
        }

        const { data: existingPayment } = await query.maybeSingle();
        if (existingPayment) {
          return {
            isDuplicate: true,
            orderNumber: (existingPayment.orders as any)?.order_number || undefined,
          };
        }
      } catch (err) {
        console.warn('Direct Supabase check duplicate error:', err);
      }
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

    let submitSuccess = false;
    let paymentRecordId: string | undefined;
    let returnedOrderNumber = targetOrderCheck?.order_number;

    // 1. Try server API endpoint with safe JSON parsing
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

      const text = await res.text();
      let result: any = null;
      try {
        result = text ? JSON.parse(text) : null;
      } catch {
        console.warn('Non-JSON response from /api/payments/submit:', text?.slice(0, 100));
      }

      if (res.ok && result?.success && result.payment) {
        submitSuccess = true;
        paymentRecordId = result.payment.id;
        if (result.order?.order_number) {
          returnedOrderNumber = result.order.order_number;
        }
      } else if (result?.error && !result.error.includes('Internal server error')) {
        throw new Error(result.error);
      }
    } catch (apiErr: any) {
      if (apiErr?.message && !apiErr.message.includes('JSON') && !apiErr.message.includes('fetch')) {
        throw apiErr;
      }
      console.warn('API /api/payments/submit unavailable or returned non-JSON, falling back to direct Supabase:', apiErr);
    }

    // 2. Direct Supabase Fallback (crucial for Vercel SPA deployments where server.ts is not running)
    if (!submitSuccess && isSupabaseConfigured && supabase) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      let orderQuery = supabase
        .from('orders')
        .select('id, order_number, total_amount, payment_session_expires_at');

      if (isUUID) {
        orderQuery = orderQuery.or(`id.eq.${orderId},order_number.eq.${orderId}`);
      } else {
        orderQuery = orderQuery.ilike('order_number', orderId);
      }

      const { data: dbOrder, error: orderErr } = await orderQuery.maybeSingle();

      if (orderErr || !dbOrder) {
        throw new Error('Order not found in database. Payment can only be submitted for an existing order.');
      }

      returnedOrderNumber = dbOrder.order_number;

      // Check 10-minute session expiration
      if (dbOrder.payment_session_expires_at) {
        const expiresAtTime = new Date(dbOrder.payment_session_expires_at).getTime();
        if (Date.now() >= expiresAtTime) {
          await supabase
            .from('orders')
            .update({ order_status: 'PAYMENT_EXPIRED', updated_at: new Date().toISOString() })
            .eq('id', dbOrder.id);
          throw new Error('The 10-minute payment session has expired. This order has been cancelled.');
        }
      }

      const cleanTx = transactionId ? String(transactionId).trim().toUpperCase() : null;
      const paymentPayload: Record<string, any> = {
        order_id: dbOrder.id,
        amount: Number(amount) || Number(dbOrder.total_amount) || 0,
        transaction_id: cleanTx,
        screenshot_url: screenshotUrl || null,
        upi_id: upiId || null,
        payment_status: 'PENDING',
        updated_at: new Date().toISOString(),
      };

      // Check existing payment row
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('order_id', dbOrder.id)
        .maybeSingle();

      if (existingPayment) {
        const { error: updateErr } = await supabase
          .from('payments')
          .update(paymentPayload)
          .eq('id', existingPayment.id);

        if (updateErr) {
          console.error('Payment update error in Supabase:', updateErr);
          throw new Error('Failed to update payment record in database: ' + updateErr.message);
        }
        paymentRecordId = existingPayment.id;
      } else {
        const { data: newPayment, error: insertErr } = await supabase
          .from('payments')
          .insert([paymentPayload])
          .select('id')
          .maybeSingle();

        if (insertErr) {
          console.error('Payment insert error in Supabase:', insertErr);
          throw new Error('Failed to create payment record in database: ' + insertErr.message);
        }
        paymentRecordId = newPayment?.id;
      }

      // Update order status to PAYMENT_PROCESSING
      await supabase
        .from('orders')
        .update({
          order_status: 'PAYMENT_PROCESSING',
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbOrder.id);

      submitSuccess = true;
    }

    if (!submitSuccess) {
      throw new Error('Failed to submit payment. Please verify your connection or try again.');
    }

    const returnedPayment: Payment = {
      id: paymentRecordId || `pay-${Date.now()}`,
      order_id: targetOrderCheck?.id || orderId,
      amount: targetOrderCheck?.total_amount || amount,
      transaction_id: transactionId,
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

    return returnedPayment;
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

