import { useState, useCallback } from 'react';
import { Payment } from '../../../types';
import { paymentService } from '../services/paymentService';

export function usePayment(orderId?: string) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayment = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.getByOrderId(orderId);
      setPayment(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  return {
    payment,
    loading,
    error,
    fetchPayment,
  };
}
