import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService, AdminUser } from '../../services/authService';
import {
  LayoutDashboard,
  Box,
  ShoppingBag,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Menu,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../common/Toast';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    authService.getCurrentUser().then((user) => {
      if (!user) {
        navigate('/admin/login');
      } else {
        setCurrentUser(user);
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await authService.logout();
    showToast('Logged out of Admin Portal.', 'info');
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Orders & Payments', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Product Catalog', path: '/admin/products', icon: Box },
    { label: 'Settings & Supabase', path: '/admin/settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path || (path !== '/admin/dashboard' && location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row">
      {/* Sidebar on Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-neutral-800 bg-neutral-900/40 p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo & Admin badge */}
          <div className="space-y-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-neutral-950 rounded-[6px] flex items-center justify-center">
                  <Box className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="font-display font-bold text-base text-white">PRINTLAB 3D</span>
            </Link>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
              <ShieldCheck className="w-3 h-3 text-indigo-400" /> ADMIN PORTAL
            </div>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-cyan-400' : 'text-neutral-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User info & actions */}
        <div className="pt-4 border-t border-neutral-800/80 space-y-3">
          <div className="px-2">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Logged In As</span>
            <span className="text-xs font-medium text-neutral-200 truncate block">
              {currentUser?.email || 'admin@printlab.io'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Link
              to="/"
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs transition-colors border border-neutral-800"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" /> Customer Store
              </span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs transition-colors border border-rose-900/30"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <div className="md:hidden border-b border-neutral-800 bg-neutral-950 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-cyan-400" />
          <span className="font-display font-bold text-sm text-white">PRINTLAB ADMIN</span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-neutral-900 border-b border-neutral-800 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                isActive(item.path) ? 'bg-cyan-500/20 text-cyan-300' : 'text-neutral-400'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-neutral-800 flex justify-between items-center">
            <Link to="/" className="text-xs text-cyan-400">View Store</Link>
            <button onClick={handleLogout} className="text-xs text-rose-400">Logout</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
};
