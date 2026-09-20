import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService, AdminUser } from '../../services/authService';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      try {
        const user = await authService.getCurrentAdmin();
        if (isMounted) {
          // Strictly verify administrator role
          if (user && user.role === 'admin') {
            setAdminUser(user);
          } else {
            setAdminUser(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setAdminUser(null);
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="mt-4 text-xs font-mono text-neutral-400 uppercase tracking-wider">
          Verifying Administrator Privileges...
        </span>
      </div>
    );
  }

  // If user is not authenticated or lacks admin privileges, redirect to dedicated admin login
  if (!adminUser || adminUser.role !== 'admin') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
