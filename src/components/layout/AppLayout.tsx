import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black transition-colors duration-200">
      {!isAdminRoute && <Navbar />}
      <main className="flex-1">
        {children || <Outlet />}
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
};
