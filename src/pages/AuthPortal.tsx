import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { departmentService } from '../services/departmentService';
import { Department } from '../types';
import { useToast } from '../components/common/Toast';
import {
  Box,
  ShieldCheck,
  User,
  Mail,
  Lock,
  Phone,
  GraduationCap,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  KeyRound,
  AlertCircle,
  LogIn,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const AuthPortal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customerMode, setCustomerMode] = useState<'signin' | 'signup'>('signin');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Unconfirmed Email Handling
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Recovery Mode State
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Customer Login Form State (Clean: No hardcoded demo credentials)
  const [customerIdentifier, setCustomerIdentifier] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');

  // Customer Signup Form State
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    college_type: 'KPR College' as 'KPR College' | 'Other',
    college: 'KPR College',
    roll_number: '',
    department: '',
    department_id: '',
    year: '3rd Year',
    section: 'A',
    building_block: 'Academic Block III',
    pickup_location: 'Classroom Delivery',
    address: '',
    city: 'Coimbatore',
    pincode: '641407',
  });

  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  // Load active departments for selected college from Supabase
  useEffect(() => {
    if (signupForm.college_type === 'KPR College') {
      setLoadingDepts(true);
      departmentService
        .getActive('KPR College')
        .then((depts) => {
          setAvailableDepartments(depts);
        })
        .catch((err) => console.warn('Failed to load active departments:', err))
        .finally(() => setLoadingDepts(false));
    } else {
      setAvailableDepartments([]);
    }
  }, [signupForm.college_type, signupForm.college]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const redirectUrl = searchParams.get('redirect') || '';
  const tabParam = searchParams.get('tab');

  const getResolvedCustomerRedirect = () => {
    const redirect = searchParams.get('redirect');
    if (!redirect) return '/customer/orders';

    // Preserve product ordering query parameters
    const productId = searchParams.get('productId');
    const selectedColor = searchParams.get('selectedColor');
    const quantity = searchParams.get('quantity');

    if (redirect === '/order' || redirect.startsWith('/order')) {
      const params = new URLSearchParams();
      if (productId) params.set('productId', productId);
      if (selectedColor) params.set('selectedColor', selectedColor);
      if (quantity) params.set('quantity', quantity);
      const qs = params.toString();
      return qs ? `/order?${qs}` : '/order';
    }

    return redirect;
  };

  useEffect(() => {
    // If admin tab requested, redirect to dedicated /admin/login route
    if (tabParam === 'admin') {
      navigate('/admin/login', { replace: true });
      return;
    }

    // Check for password recovery link from Supabase Auth
    const typeParam = searchParams.get('type');
    const hash = window.location.hash;
    if (typeParam === 'recovery' || hash.includes('type=recovery')) {
      setRecoveryMode(true);
    }
  }, [tabParam, searchParams, navigate]);

  // Handle Customer Sign In
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerIdentifier.trim()) {
      setErrorMessage('Please enter your email or 10-digit mobile phone number.');
      return;
    }
    if (!customerPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setUnconfirmedEmail(null);

    try {
      const user = await authService.loginCustomer(customerIdentifier, customerPassword);
      showToast(`Welcome back, ${user.name}!`, 'success');
      navigate(getResolvedCustomerRedirect());
    } catch (err: any) {
      const msg = err.message || '';
      if (
        err.code === 'email_not_confirmed' ||
        msg.toLowerCase().includes('email not confirmed') ||
        msg.toLowerCase().includes('confirm your email')
      ) {
        const email = err.email || (customerIdentifier.includes('@') ? customerIdentifier.trim() : null);
        setUnconfirmedEmail(email);
        setErrorMessage('Please confirm your email before signing in.');
      } else {
        setErrorMessage(msg || 'Failed to login as customer.');
      }
      showToast(msg || 'Customer login error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend Confirmation Email
  const handleResendConfirmation = async () => {
    const emailToResend = unconfirmedEmail || (customerIdentifier.includes('@') ? customerIdentifier.trim() : '');
    if (!emailToResend) {
      showToast('Please enter your account email address to resend confirmation.', 'error');
      return;
    }

    setResendingEmail(true);
    try {
      await authService.resendConfirmationEmail(emailToResend);
      showToast(`Confirmation email resent to ${emailToResend}! Check your inbox.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to resend confirmation email.', 'error');
    } finally {
      setResendingEmail(false);
    }
  };

  // Handle Customer Registration
  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!signupForm.email.trim() || !emailRegex.test(signupForm.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    const cleanPhone = signupForm.phone.replace(/\D/g, '').slice(0, 10);
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }
    if (!signupForm.password || signupForm.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (signupForm.college_type === 'KPR College' && !signupForm.department.trim()) {
      setErrorMessage('Please select your department at KPR College.');
      return;
    }

    if (signupForm.college_type === 'Other' && (!signupForm.college || signupForm.college.trim().length < 2)) {
      setErrorMessage('Please enter your College / Institution name.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setUnconfirmedEmail(null);

    try {
      const user = await authService.signupCustomer(signupForm);
      if (user.needsEmailConfirmation) {
        showToast('Registration successful! Please confirm your email before signing in.', 'info');
        setCustomerMode('signin');
        setCustomerIdentifier(signupForm.email.trim());
        setUnconfirmedEmail(signupForm.email.trim());
        setErrorMessage('Account registered! Please click the confirmation link sent to your email before signing in.');
      } else {
        showToast(`Account created successfully! Welcome, ${user.name}.`, 'success');
        navigate(getResolvedCustomerRedirect());
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
      showToast(err.message || 'Registration error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset Request
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    try {
      setLoading(true);
      await authService.resetCustomerPassword(forgotEmail.trim());
      showToast('Password reset link sent to your email address.', 'success');
      setShowForgotPassword(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to send password reset email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Update Password (from Recovery Link)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    setErrorMessage('');

    try {
      await authService.updateCustomerPassword(newPassword);
      showToast('Password updated successfully! Welcome back.', 'success');
      setRecoveryMode(false);
      navigate(getResolvedCustomerRedirect());
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-xl space-y-6">
        {/* Top Header Card */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shadow-xl shadow-cyan-500/20 mb-2">
            <div className="w-full h-full bg-slate-50 dark:bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Box className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            PRINTLAB <span className="text-cyan-600 dark:text-cyan-400">3D</span> Customer Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 max-w-md mx-auto">
            Sign in to track orders, manage prints, and complete your checkout.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="bg-white dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
          {/* Context Banner when coming from Buy Product / Order */}
          {redirectUrl.includes('/order') && (
            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0">
                <Box className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-cyan-800 dark:text-cyan-300 block">
                  Complete Your 3D Print Order
                </span>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400">
                  {customerMode === 'signin'
                    ? 'Existing Customer: Sign in with your password to proceed to Checkout.'
                    : 'New Customer: Complete registration once to proceed to Checkout.'}
                </p>
              </div>
            </div>
          )}

          {/* Unconfirmed Email Alert with 1-Click Resend */}
          {unconfirmedEmail && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Email Confirmation Required
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Please confirm your email address (<span className="font-mono font-semibold">{unconfirmedEmail}</span>) before signing in. A confirmation link has been sent to your inbox.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={resendingEmail}
                  onClick={handleResendConfirmation}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendingEmail ? 'animate-spin' : ''}`} />
                  <span>{resendingEmail ? 'Resending Link...' : 'Resend Confirmation Email'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUnconfirmedEmail(null)}
                  className="text-xs text-amber-700 dark:text-amber-400 hover:underline cursor-pointer font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Recovery Mode (Set New Password) */}
          {recoveryMode ? (
            <div className="space-y-4">
              <div className="space-y-1 pb-3 border-b border-slate-200 dark:border-neutral-800">
                <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <span>Set New Password</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Enter your new password below to update your account credentials.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                    <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                    <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{updatingPassword ? 'Updating Password...' : 'Save New Password & Sign In'}</span>
                </button>
              </form>
            </div>
          ) : showForgotPassword ? (
            /* Forgot Password Flow */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
                <div>
                  <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-white">
                    Reset Password
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Enter your registered email to receive a password reset link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                    <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Account Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  <span>{loading ? 'Sending Link...' : 'Send Password Reset Link'}</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
                  >
                    Remember your password? Back to Sign In →
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Customer Subtab: Sign In vs Sign Up */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
                <div>
                  <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-white">
                    {customerMode === 'signin' ? 'Customer Sign In' : 'Create Account'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {customerMode === 'signin'
                      ? 'Enter your credentials to continue'
                      : 'Register once to manage orders and checkout'}
                  </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-neutral-950 p-1 rounded-xl border border-slate-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('signin');
                      setErrorMessage('');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      customerMode === 'signin'
                        ? 'bg-white dark:bg-neutral-800 text-cyan-700 dark:text-cyan-300 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('signup');
                      setErrorMessage('');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      customerMode === 'signup'
                        ? 'bg-white dark:bg-neutral-800 text-cyan-700 dark:text-cyan-300 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>

              {/* Customer Sign In Form - Pure Real Authentication */}
              {customerMode === 'signin' ? (
                <form onSubmit={handleCustomerLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                      <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Email or Mobile Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={customerIdentifier}
                      onChange={(e) => setCustomerIdentifier(e.target.value)}
                      placeholder="e.g. name@example.com or 9876543210"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                        <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(customerIdentifier.includes('@') ? customerIdentifier.trim() : '');
                          setShowForgotPassword(true);
                        }}
                        className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{loading ? 'Signing In...' : 'Login'}</span>
                  </button>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerMode('signup');
                        setErrorMessage('');
                      }}
                      className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
                    >
                      Don't have an account? Create Account →
                    </button>
                  </div>
                </form>
              ) : (
                /* Customer Sign Up Form */
                <form onSubmit={handleCustomerSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                      <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.name}
                      onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                      placeholder="e.g. Sanjay Kumar"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Phone Number *
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      value={signupForm.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setSignupForm({ ...signupForm, phone: val });
                      }}
                      placeholder="10-digit mobile (e.g. 9876543210)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                      <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      placeholder="name@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                      <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Create Password
                    </label>
                    <input
                      type="password"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> College Name *
                    </span>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">KPR College gets direct campus delivery</span>
                  </label>

                  {/* College Name Selection Dropdown */}
                  <select
                    value={signupForm.college_type}
                    onChange={(e) => {
                      const val = e.target.value as 'KPR College' | 'Other';
                      setSignupForm({
                        ...signupForm,
                        college_type: val,
                        college: val === 'KPR College' ? 'KPR College' : '',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none font-medium"
                  >
                    <option value="KPR College">KPR College</option>
                    <option value="Other">Other</option>
                  </select>

                  {signupForm.college_type === 'Other' && (
                    <input
                      type="text"
                      required
                      value={signupForm.college}
                      onChange={(e) => setSignupForm({ ...signupForm, college: e.target.value })}
                      placeholder="Enter your College / University name *"
                      className="w-full mt-2 px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                    />
                  )}
                </div>

                {/* KPR College Fields: Department & Year of Study */}
                {signupForm.college_type === 'KPR College' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Department Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                          <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Department *
                        </label>
                        <select
                          required
                          value={signupForm.department_id || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedDept = availableDepartments.find((d) => d.id === selectedId);
                            const deptYears = selectedDept?.years && selectedDept.years.length > 0 ? selectedDept.years : ['1st Year', '2nd Year', '3rd Year', '4th Year'];
                            setSignupForm({
                              ...signupForm,
                              department_id: selectedId,
                              department: selectedDept ? `${selectedDept.name} (${selectedDept.code})` : '',
                              year: deptYears.includes(signupForm.year) ? signupForm.year : deptYears[0],
                            });
                          }}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        >
                          <option value="">{loadingDepts ? 'Loading departments...' : 'Select Department *'}</option>
                          {availableDepartments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Year of Study Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Year of Study *
                        </label>
                        <select
                          value={signupForm.year}
                          onChange={(e) => setSignupForm({ ...signupForm, year: e.target.value })}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        >
                          {(() => {
                            const currentDept = availableDepartments.find((d) => d.id === signupForm.department_id);
                            const yearsList = currentDept?.years && currentDept.years.length > 0 ? currentDept.years : ['1st Year', '2nd Year', '3rd Year', '4th Year'];
                            return yearsList.map((yr) => (
                              <option key={yr} value={yr}>
                                {yr}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Roll / Reg Number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Roll / Reg Number
                        </label>
                        <input
                          type="text"
                          value={signupForm.roll_number}
                          onChange={(e) => setSignupForm({ ...signupForm, roll_number: e.target.value.toUpperCase() })}
                          placeholder="e.g. 22CS104 / 711321..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      {/* Hostel / Campus Room or Class Delivery */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Hostel / Campus Room or Class
                        </label>
                        <input
                          type="text"
                          value={signupForm.address}
                          onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                          placeholder="e.g. Tharangini Hostel Room 302 or Class CSE-3A"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Roll / Reg Number
                        </label>
                        <input
                          type="text"
                          value={signupForm.roll_number}
                          onChange={(e) => setSignupForm({ ...signupForm, roll_number: e.target.value.toUpperCase() })}
                          placeholder="e.g. 22CS104"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> City / Region
                        </label>
                        <input
                          type="text"
                          value={signupForm.city}
                          onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                          placeholder="e.g. Coimbatore / Chennai"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Home Delivery Address
                      </label>
                      <input
                        type="text"
                        value={signupForm.address}
                        onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                        placeholder="e.g. #42 North Street, Gandhi Nagar"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}


                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Creating Profile...' : 'Complete Customer Registration'}</span>
                </button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('signin');
                      setErrorMessage('');
                    }}
                    className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
                  >
                    Already have an account? Sign In with password (Existing User) →
                  </button>
                </div>
              </form>
            )}
            </>
          )}

          {/* Continue as Guest option */}
            <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Don't want to create an account right now?
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-1 text-xs text-cyan-700 dark:text-cyan-400 hover:underline font-mono font-semibold"
              >
                <span>Browse Products & Order as Guest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
  );
};
