import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Box, Lock, Mail, ShieldCheck, ArrowRight, Sparkles, Key, Sun, Moon } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { useTheme } from '../../context/ThemeContext';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    setLoading(true);

    try {
      const user = await authService.login(email.trim(), password);
      if (user) {
        showToast(`Welcome back, ${user.email}`, 'success');
        navigate('/admin/dashboard');
      } else {
        showToast('Invalid admin credentials.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-neutral-950 transition-colors relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-300 dark:border-neutral-800 bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 transition-all cursor-pointer flex items-center justify-center shadow-sm"
          title={theme === 'light' ? 'Switch to Dark Mode (🌙)' : 'Switch to Light Mode (☀️)'}
          aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? (
            <Sun className="w-4 h-4 text-amber-500 animate-in spin-in-180" />
          ) : (
            <Moon className="w-4 h-4 text-cyan-400 animate-in spin-in-180" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-3xl p-8 space-y-8 shadow-sm dark:shadow-2xl relative overflow-hidden">
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-50 dark:bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Box className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Admin Portal</h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400">
            Sign in to verify UPI payments, manage 3D products, and track print jobs.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
              <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none font-mono transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-pass" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
              <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Password
            </label>
            <input
              id="admin-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Return to website / Customer Login */}
        <div className="text-center pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
          <Link to="/" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
            ← Back to Store
          </Link>
          <Link to="/login" className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium">
            Switch to Customer Login →
          </Link>
        </div>
      </div>
    </div>
  );
};
