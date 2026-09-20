import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Box, Lock, Mail, ShieldCheck, ArrowRight, Sparkles, Key } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState('admin@printlab.io');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleFillDemo = () => {
    setEmail('admin@printlab.io');
    setPassword('admin123');
    showToast('Loaded default demo credentials.', 'info');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Box className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Admin Portal</h1>
          <p className="text-xs text-neutral-400">
            Sign in to verify UPI payments, manage 3D products, and track print jobs.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="font-mono text-neutral-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" /> Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@printlab.io"
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-pass" className="font-mono text-neutral-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" /> Password
            </label>
            <input
              id="admin-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
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

        {/* Demo Helper Box */}
        <div className="pt-4 border-t border-neutral-800/80 text-center space-y-2">
          <span className="text-[11px] font-mono text-neutral-400 block">
            Demo Credentials (Preloaded)
          </span>
          <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 flex items-center justify-between">
            <div className="text-left">
              <div>admin@printlab.io</div>
              <div className="text-neutral-400">admin123</div>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 rounded-md text-[10px] flex items-center gap-1"
            >
              <Key className="w-3 h-3" /> Auto-Fill
            </button>
          </div>
        </div>

        {/* Return to website / Customer Login */}
        <div className="text-center pt-1 flex items-center justify-between text-xs text-neutral-400">
          <Link to="/" className="hover:text-cyan-400 transition-colors">
            ← Back to Store
          </Link>
          <Link to="/login?tab=customer" className="text-cyan-400 hover:underline">
            Switch to Customer Login →
          </Link>
        </div>
      </div>
    </div>
  );
};
