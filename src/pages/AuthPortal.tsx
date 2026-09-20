import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';
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
  Sparkles,
  KeyRound,
  AlertCircle,
  LogIn,
  UserPlus,
} from 'lucide-react';

export const AuthPortal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const initialTab = searchParams.get('tab') === 'admin' ? 'admin' : 'customer';
  const [roleTab, setRoleTab] = useState<'customer' | 'admin'>(initialTab);
  const [customerMode, setCustomerMode] = useState<'signin' | 'signup'>('signin');

  // Customer Login Form State
  const [customerIdentifier, setCustomerIdentifier] = useState('sanjay150724@gmail.com');
  const [customerPassword, setCustomerPassword] = useState('customer123');

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
    year: '3rd Year',
    section: 'A',
    building_block: 'Academic Block III',
    pickup_location: 'Classroom Delivery',
    address: '',
    city: 'Coimbatore',
    pincode: '641407',
  });


  // Admin Login Form State
  const [adminEmail, setAdminEmail] = useState('admin@printlab.io');
  const [adminPassword, setAdminPassword] = useState('admin123');

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
    if (tabParam === 'admin') setRoleTab('admin');
    else if (tabParam === 'customer') setRoleTab('customer');
  }, [tabParam]);

  const switchRoleTab = (tab: 'customer' | 'admin') => {
    setRoleTab(tab);
    setErrorMessage('');
    setSearchParams(tab === 'admin' ? { tab: 'admin' } : { tab: 'customer' });
  };

  // Handle Customer Sign In
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerIdentifier.trim()) {
      setErrorMessage('Please enter your email or 10-digit mobile phone number.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const user = await authService.loginCustomer(customerIdentifier, customerPassword);
      showToast(`Welcome back, ${user.name}!`, 'success');
      navigate(getResolvedCustomerRedirect());
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to login as customer.');
      showToast(err.message || 'Customer login error', 'error');
    } finally {
      setLoading(false);
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
    const cleanPhone = signupForm.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (signupForm.college_type === 'Other' && (!signupForm.college || signupForm.college.trim().length < 2)) {
      setErrorMessage('Please enter your College / Institution name.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const user = await authService.signupCustomer(signupForm);
      showToast(`Account created successfully! Welcome, ${user.name}.`, 'success');
      navigate(getResolvedCustomerRedirect());
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
      showToast(err.message || 'Registration error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Sign In
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setErrorMessage('Please provide both admin email and password.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const admin = await authService.loginAdmin(adminEmail, adminPassword);
      showToast(`Admin authenticated. Welcome, ${admin.name || 'Admin'}!`, 'success');
      navigate(redirectUrl || '/admin/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid admin credentials.');
      showToast(err.message || 'Admin login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo Logins
  const handleDemoCustomerLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const demo = authService.getDemoCustomer();
      await authService.loginCustomer(demo.email, 'customer123');
      showToast(`Logged in as demo customer (${demo.name})`, 'success');
      navigate(redirectUrl || '/customer/orders');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdminLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await authService.loginAdmin('admin@printlab.io', 'admin123');
      showToast('Logged in as Store Admin', 'success');
      navigate('/admin/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
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
            PRINTLAB <span className="text-cyan-600 dark:text-cyan-400">3D</span> Access Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 max-w-md mx-auto">
            Sign in to track orders, manage prints, or access administrative tools.
          </p>
        </div>

        {/* Dual Role Selector Tab */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-neutral-900/90 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm">
          <button
            type="button"
            onClick={() => switchRoleTab('customer')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              roleTab === 'customer'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/20'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-neutral-800/50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Customer Login</span>
          </button>

          <button
            type="button"
            onClick={() => switchRoleTab('admin')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              roleTab === 'admin'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-neutral-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CUSTOMER TAB CONTENT */}
        {/* ========================================================================= */}
        {roleTab === 'customer' && (
          <div className="bg-white dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
            {/* Customer Subtab: Sign In vs Sign Up */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
              <div>
                <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-white">
                  {customerMode === 'signin' ? 'Customer Sign In' : 'Create Customer Account'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {customerMode === 'signin'
                    ? 'Track your 3D orders & manage delivery details'
                    : 'Get fast checkout and live 3D print tracking'}
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
                    customerMode === 'signin' ? 'bg-white dark:bg-neutral-800 text-cyan-700 dark:text-cyan-300 font-semibold shadow-sm' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
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
                    customerMode === 'signup' ? 'bg-white dark:bg-neutral-800 text-cyan-700 dark:text-cyan-300 font-semibold shadow-sm' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Quick 1-Click Demo Banner */}
            <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-semibold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Demo Customer Account
                </span>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400">
                  Auto-fill demo test customer (Sanjay Kumar - NIT)
                </p>
              </div>
              <button
                type="button"
                onClick={handleDemoCustomerLogin}
                disabled={loading}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-sm cursor-pointer"
              >
                1-Click Demo Login
              </button>
            </div>

            {/* Customer Sign In Form */}
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
                    placeholder="sanjay150724@gmail.com or 9876543210"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                      <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Password (Optional / customer123)
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">Default: customer123</span>
                  </div>
                  <input
                    type="password"
                    value={customerPassword}
                    onChange={(e) => setCustomerPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? 'Signing In...' : 'Sign In to Customer Hub'}</span>
                </button>
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
                      required
                      value={signupForm.phone}
                      onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  {signupForm.college_type === 'KPR College' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                        <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Department
                      </label>
                      <select
                        value={signupForm.department}
                        onChange={(e) => setSignupForm({ ...signupForm, department: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="">Select Department</option>
                        <option value="Computer Science & Engineering">CSE</option>
                        <option value="Artificial Intelligence & Data Science">AI & DS</option>
                        <option value="Information Technology">IT</option>
                        <option value="Electronics & Communication">ECE</option>
                        <option value="Electrical & Electronics">EEE</option>
                        <option value="Mechanical Engineering">Mechanical</option>
                        <option value="Civil Engineering">Civil</option>
                        <option value="Biomedical Engineering">Biomedical</option>
                        <option value="Chemical Engineering">Chemical</option>
                        <option value="Mechatronics">Mechatronics</option>
                        <option value="Other Department">Other Department</option>
                      </select>
                    </div>
                  ) : (
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
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />{' '}
                    {signupForm.college_type === 'KPR College' ? 'Hostel / Campus Room or Class Delivery' : 'Home Delivery Address'}
                  </label>
                  <input
                    type="text"
                    value={signupForm.address}
                    onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                    placeholder={
                      signupForm.college_type === 'KPR College'
                        ? 'e.g. Tharangini Hostel Room 302 or Class CSE-3A'
                        : 'e.g. #42 North Street, Gandhi Nagar'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>


                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Creating Profile...' : 'Complete Customer Registration'}</span>
                </button>
              </form>
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
        )}

        {/* ========================================================================= */}
        {/* ADMIN TAB CONTENT */}
        {/* ========================================================================= */}
        {roleTab === 'admin' && (
          <div className="bg-white dark:bg-neutral-900/60 backdrop-blur-xl border border-indigo-200 dark:border-indigo-900/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
            <div className="border-b border-slate-200 dark:border-neutral-800 pb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-mono mb-2 font-semibold">
                <ShieldCheck className="w-3 h-3" /> RESTRICTED ACCESS
              </div>
              <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-white">
                Admin & Stall Operator Sign In
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Verify UPI payment proofs, manage live 3D print queues, and update products.
              </p>
            </div>

            {/* Quick 1-Click Demo Admin Banner */}
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Demo Admin Access
                </span>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 font-mono">
                  admin@printlab.io / admin123
                </p>
              </div>
              <button
                type="button"
                onClick={handleDemoAdminLogin}
                disabled={loading}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-sm cursor-pointer"
              >
                1-Click Admin Login
              </button>
            </div>

            {/* Admin Login Form */}
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@printlab.io"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Admin Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Authenticating Admin...' : 'Open Admin Operations Console'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
