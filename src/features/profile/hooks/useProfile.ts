import { useState, useEffect } from 'react';
import { CustomerUser } from '../../../types';
import { authService } from '../../../services/authService';
import { customerService } from '../services/customerService';

export function useProfile() {
  const [profile, setProfile] = useState<CustomerUser | null>(authService.getCurrentCustomer());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(authService.getCurrentCustomer());
  }, []);

  const updateProfile = async (updates: Partial<CustomerUser>) => {
    if (!profile) return null;
    setLoading(true);
    setError(null);
    try {
      const updated = await customerService.update(profile.id, updates);
      // Update local storage via authService
      const current = authService.getCurrentCustomer();
      if (current) {
        const merged = { ...current, ...updates };
        localStorage.setItem('printlab_customer_user', JSON.stringify(merged));
        setProfile(merged);
      }
      return updated;
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, error, updateProfile };
}
