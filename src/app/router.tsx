import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { FloatingWhatsApp } from '../components/common/FloatingWhatsApp';

// Lazy-loaded Pages for performance & code splitting
const Home = lazy(() => import('../pages/Home').then((m) => ({ default: m.Home })));
const Products = lazy(() => import('../pages/Products').then((m) => ({ default: m.Products })));
const ProductDetails = lazy(() => import('../pages/ProductDetails').then((m) => ({ default: m.ProductDetails })));
const OrderPage = lazy(() => import('../pages/OrderPage').then((m) => ({ default: m.OrderPage })));
const PaymentPage = lazy(() => import('../pages/PaymentPage').then((m) => ({ default: m.PaymentPage })));
const PaymentVerification = lazy(() => import('../pages/PaymentVerification').then((m) => ({ default: m.PaymentVerification })));
const OrderSuccess = lazy(() => import('../pages/OrderSuccess').then((m) => ({ default: m.OrderSuccess })));
const TrackOrder = lazy(() => import('../pages/TrackOrder').then((m) => ({ default: m.TrackOrder })));
const About = lazy(() => import('../pages/About').then((m) => ({ default: m.About })));
const AuthPortal = lazy(() => import('../pages/AuthPortal').then((m) => ({ default: m.AuthPortal })));
const CustomerDashboard = lazy(() => import('../pages/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard })));

// Lazy-loaded Admin Pages
const AdminLogin = lazy(() => import('../pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminOrders = lazy(() => import('../pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })));
const AdminProducts = lazy(() => import('../pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })));
const AdminShowcase = lazy(() => import('../pages/admin/AdminShowcase').then((m) => ({ default: m.AdminShowcase })));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })));
import { AdminProtectedRoute } from '../components/admin/AdminProtectedRoute';

const PageLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] py-16">
    <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    <span className="mt-4 text-xs font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
      Loading...
    </span>
  </div>
);

export const AppRouter: React.FC = () => {
  const location = useLocation();
  // Ensure customer navbar and footer are NEVER shown on admin routes
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black transition-colors duration-200">
      {!isAdminRoute && <Navbar />}

      <main className="flex-1">
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public Customer Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetails />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/checkout" element={<OrderPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/payment/:orderId" element={<PaymentPage />} />
            <Route path="/payment-verification" element={<PaymentVerification />} />
            <Route path="/order-success/:id" element={<OrderSuccess />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/track" element={<TrackOrder />} />
            <Route path="/about" element={<About />} />

            {/* Authentication & Customer Portal Routes */}
            <Route path="/login" element={<AuthPortal />} />
            <Route path="/customer/login" element={<AuthPortal />} />
            <Route path="/customer" element={<Navigate to="/customer/orders" replace />} />
            <Route path="/customer/orders" element={<CustomerDashboard />} />
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />

            {/* Dedicated Admin Routes - Strictly Protected */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminProtectedRoute>
                  <AdminOrders />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminProtectedRoute>
                  <AdminProducts />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/showcase"
              element={
                <AdminProtectedRoute>
                  <AdminShowcase />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminProtectedRoute>
                  <AdminSettings />
                </AdminProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!isAdminRoute && <FloatingWhatsApp />}
      {!isAdminRoute && <Footer />}
    </div>
  );
};
