import { useState, useEffect, useCallback } from 'react';
import { AdminStats } from '../../types';
import { orderService } from '../../services/orderService';

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch admin stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
