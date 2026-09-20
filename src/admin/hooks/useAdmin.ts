import { useState, useEffect } from 'react';
import { AdminUser } from '../../types';
import { authService } from '../../services/authService';

export function useAdmin() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    authService.getCurrentAdmin().then((user) => {
      if (isMounted) {
        setAdmin(user);
        setIsAuthenticated(Boolean(user));
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    await authService.logoutAdmin();
    setAdmin(null);
    setIsAuthenticated(false);
  };

  return {
    admin,
    isAuthenticated,
    loading,
    logout,
  };
}
