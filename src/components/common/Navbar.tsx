import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Layers,
  ShieldCheck,
  Menu,
  X,
  ArrowUpRight,
  User,
  Sun,
  Moon,
  LogOut,
  ShoppingBag,
  LogIn,
  ChevronDown
} from 'lucide-react';
import { authService } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isAdmin = authService.isAdminAuthenticated();
  const currentCustomer = authService.getCurrentCustomer();
  const currentAdmin = authService.getCurrentAdmin();

  // Close dropdown on route change or outside click
  useEffect(() => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'Track Order', path: '/track' },
    { name: 'Custom Print', path: '/order' },
    { name: 'About', path: '/about' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleCustomerLogout = async () => {
    await authService.logoutCustomer();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const handleAdminLogout = async () => {
    await authService.logoutAdmin();
    setUserDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-950/85 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-white dark:bg-neutral-950 rounded-[10px] flex items-center justify-center">
                <Box className="w-5 h-5 text-cyan-500 dark:text-cyan-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg sm:text-xl tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                PRINTLAB <span className="text-cyan-600 dark:text-cyan-400 font-extrabold text-sm px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-950/60 rounded border border-cyan-300 dark:border-cyan-500/30">3D</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-neutral-400">Additives & Custom Lab</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-neutral-900/60 p-1.5 rounded-full border border-slate-200 dark:border-neutral-800">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-white dark:bg-neutral-800 text-cyan-700 dark:text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-neutral-800/40'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right Action Items */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Theme Toggle Button (Light/White vs Dark mode) */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light / White' : 'Dark'} Theme`}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 animate-in spin-in-180" />
              )}
            </button>

            {/* Customer Avatar & Menu */}
            {currentCustomer ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 text-xs font-medium hover:border-cyan-500/40 transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
                    {currentCustomer.name ? currentCustomer.name[0].toUpperCase() : 'C'}
                  </div>
                  <span className="max-w-[100px] truncate">{currentCustomer.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800 text-xs">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{currentCustomer.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">{currentCustomer.email}</p>
                    </div>

                    <Link
                      to="/customer/orders"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4 text-cyan-500" />
                      <span>My 3D Orders</span>
                    </Link>

                    <Link
                      to="/customer/orders"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <User className="w-4 h-4 text-indigo-500" />
                      <span>Customer Profile</span>
                    </Link>

                    <button
                      onClick={handleCustomerLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Dual Login Option Button */
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 text-xs font-semibold hover:border-cyan-500/40 transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Login / Register</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                    <Link
                      to="/login"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-slate-800 dark:text-neutral-200 hover:bg-cyan-50 dark:hover:bg-neutral-800/80 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-950/80 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Customer Sign In</div>
                        <div className="text-[10px] text-slate-500 dark:text-neutral-400">Track your prints & orders</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Explore / Order CTA */}
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              <span>Showcase</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile menu and theme toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 px-4 pt-3 pb-6 space-y-3 backdrop-blur-2xl transition-colors">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
                  isActive(link.path)
                    ? 'bg-slate-100 dark:bg-neutral-800 text-cyan-600 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-900'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Mobile Auth Links */}
          <div className="pt-2 border-t border-slate-200 dark:border-neutral-800/80 flex flex-col gap-2">
            {currentCustomer ? (
              <Link
                to="/customer/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 text-xs font-semibold"
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-500" />
                  My Orders & Profile ({currentCustomer.name})
                </span>
                <span className="text-cyan-500">→</span>
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-800 dark:text-neutral-200"
              >
                <User className="w-3.5 h-3.5 text-cyan-500" />
                Customer Sign In / Register
              </Link>
            )}

            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20"
            >
              <span>Explore Products</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

