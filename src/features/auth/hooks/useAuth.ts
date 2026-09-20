import { useState, useEffect, useCallback } from 'react';
import { CustomerUser, AdminUser } from '../../../types';
import { authService } from '../services/authService';

export function useAuth() {
  const [customer, setCustomer] = useState<CustomerUser | null>(authService.getCurrentCustomer());
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  const syncAuth = useCallback(() => {
    setCustomer(authService.getCurrentCustomer());
    authService.getCurrentAdmin().then(setAdmin);
  }, []);

  useEffect(() => {
    authService.getCurrentAdmin().then(setAdmin);
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, [syncAuth]);

  const logoutCustomer = async () => {
    await authService.logoutCustomer();
    setCustomer(null);
  };

  const logoutAdmin = async () => {
    await authService.logoutAdmin();
    setAdmin(null);
  };

  return {
    customer,
    admin,
    isCustomerAuthenticated: Boolean(customer),
    isAdminAuthenticated: Boolean(admin),
    logoutCustomer,
    logoutAdmin,
    syncAuth,
  };
}
