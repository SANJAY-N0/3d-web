import { useState, useEffect, useCallback } from 'react';
import { Order } from '../../../types';
import { orderService } from '../services/orderService';

export function useOrders(customerId?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (customerId) {
        const data = await orderService.getByCustomerId(customerId);
        setOrders(data);
      } else {
        const data = await orderService.getAll();
        setOrders(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}
