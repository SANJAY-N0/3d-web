import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { orderService } from '../services/orderService';
import { CustomerUser, Order } from '../types';
import { formatINR, formatUPITimestamp } from '../lib/upiUtils';
import { useToast } from '../components/common/Toast';
import {
  ShoppingBag,
  Clock,
  Box,
  GraduationCap,
  ExternalLink,
  RotateCw,
  LogOut,
  Edit3,
  ArrowRight,
  Sparkles,
  X,
  Building2,
  MapPin,
  Hash,
  BookOpen,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    college: '',
    department: '',
    roll_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const loadData = async () => {
    let current = authService.getCurrentCustomer();
    if (!current) {
      navigate('/login?tab=customer');
      return;
    }

    // Refresh from Supabase if connected to ensure latest department & roll number
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbCust } = await supabase
          .from('customers')
          .select('*')
          .or(`id.eq.${current.id},auth_user_id.eq.${current.id},email.eq.${current.email}`)
          .maybeSingle();

        if (dbCust) {
          current = { ...current, ...dbCust };
          localStorage.setItem('printlab_customer_session', JSON.stringify(current));
        }
      } catch (custErr) {
        console.warn('Customer profile refresh error:', custErr);
      }
    }
 
    if (!current) return;

    setCustomer(current);
    setProfileForm({
      name: current.name || '',
      phone: current.phone || '',
      college: current.college || '',
      department: current.department || '',
      roll_number: current.roll_number || '',
      address: current.address || '',
      city: current.city || '',
      state: current.state || 'Tamil Nadu',
      pincode: current.pincode || '641407',
    });

    try {
      const allOrders = await orderService.getAll();
      // Filter orders placed by this customer (matching customer id, phone, or email)
      const userOrders = allOrders.filter(
        (o) =>
          o.customer_id === current.id ||
          (o.customer?.email && o.customer.email.toLowerCase() === current.email.toLowerCase()) ||
          (o.customer?.phone && o.customer.phone === current.phone)
      );
      setOrders(userOrders);
    } catch (err) {
      console.warn('Failed to load customer orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
    showToast('Orders updated.', 'info');
  };

  const handleLogout = async () => {
    await authService.logoutCustomer();
    showToast('Logged out of Customer Hub.', 'info');
    navigate('/login?tab=customer');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await authService.updateCustomerProfile(profileForm);
      setCustomer(updated);
      setIsEditingProfile(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-widest">
            Loading Customer Account...
          </span>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 flex items-center justify-center shadow-xl shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full bg-slate-50 dark:bg-neutral-950 rounded-[14px] flex items-center justify-center text-xl font-bold font-display text-cyan-600 dark:text-cyan-300">
              {customer.name ? customer.name[0].toUpperCase() : 'C'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white">
                {customer.name}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 rounded-full font-semibold">
                Customer Account
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-neutral-400">
              <span className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">{customer.email}</span>
              <span>•</span>
              <span className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">{customer.phone}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-600 dark:text-neutral-400">
              {customer.college && (
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-medium text-slate-800 dark:text-neutral-200">{customer.college}</span>
                </div>
              )}

              {customer.department && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-medium text-slate-800 dark:text-neutral-200">Dept: {customer.department}</span>
                </div>
              )}

              {customer.roll_number && (
                <div className="flex items-center gap-1.5 font-mono">
                  <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-slate-800 dark:text-neutral-200">Roll: {customer.roll_number}</span>
                </div>
              )}

              {customer.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span className="truncate max-w-xs">{customer.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
          <button
            onClick={() => setIsEditingProfile(true)}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-semibold border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer shadow-sm"
            title="Refresh Orders"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-600 dark:text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> Edit Profile & Delivery Details
              </h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1 rounded-lg text-slate-400 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-mono text-slate-700 dark:text-neutral-300 uppercase font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-slate-700 dark:text-neutral-300 uppercase font-semibold">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-slate-700 dark:text-neutral-300 uppercase font-semibold">College / Institution</label>
                <input
                  type="text"
                  value={profileForm.college}
                  onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-slate-700 dark:text-neutral-300 uppercase font-semibold">Department</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                    placeholder="e.g. CSE"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-slate-700 dark:text-neutral-300 uppercase font-semibold">Roll Number</label>
                  <input
                    type="text"
                    value={profileForm.roll_number}
                    onChange={(e) => setProfileForm({ ...profileForm, roll_number: e.target.value.toUpperCase() })}
                    placeholder="e.g. 22CS104"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-slate-700 dark:text-neutral-300 uppercase font-semibold">Delivery Address / Room</label>
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-slate-700 dark:text-neutral-300 uppercase font-semibold">City</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-slate-700 dark:text-neutral-300 uppercase font-semibold">Pincode</label>
                  <input
                    type="text"
                    value={profileForm.pincode}
                    onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded-xl hover:bg-slate-200 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-semibold rounded-xl hover:opacity-90 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>Your 3D Print Orders ({orders.length})</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Real-time additive manufacturing status & payment verification details
            </p>
          </div>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-semibold hover:opacity-95 shadow-lg shadow-cyan-600/20"
          >
            <span>Place New Order</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-neutral-800/80 flex items-center justify-center mx-auto text-slate-400 dark:text-neutral-500">
              <Box className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">No Orders Placed Yet</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md mx-auto">
              You haven't placed any 3D print orders under this account. Explore our curated showcase of mechanical stands, desk planters, and custom keychains!
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Product Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const paymentSubmitted = order.payment && order.payment.payment_status !== 'PENDING';
              const paymentVerified = order.payment?.payment_status === 'VERIFIED';

              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-neutral-900/60 hover:dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 hover:border-cyan-500/30 rounded-2xl p-5 sm:p-6 transition-all space-y-4 shadow-sm dark:shadow-xl"
                >
                  {/* Top Bar: Order Number, Date, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-neutral-800/80 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-cyan-700 dark:text-cyan-400">
                          {order.order_number}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-mono">
                          • {formatUPITimestamp(order.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-neutral-300 font-medium">
                        {order.product?.name || `Product ID: ${order.product_id}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Payment Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                          paymentVerified
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                            : paymentSubmitted
                            ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30'
                            : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30'
                        }`}
                      >
                        {paymentVerified
                          ? '✓ UPI Payment Verified'
                          : paymentSubmitted
                          ? '⏳ Proof Uploaded / Under Review'
                          : '⚠️ Payment Proof Needed'}
                      </span>

                      {/* Manufacturing Status Badge */}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-neutral-800 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-neutral-700">
                        {order.order_status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Order Specs & Customization Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 dark:bg-neutral-950/60 p-4 rounded-xl border border-slate-200 dark:border-neutral-800/60">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 font-semibold">Color & Details</span>
                      <p className="font-medium text-slate-800 dark:text-neutral-200">
                        Color: <b className="text-cyan-700 dark:text-cyan-300">{order.customization?.selectedColor || 'Standard'}</b>
                      </p>
                      {order.customization?.customText && (
                        <p className="text-slate-600 dark:text-neutral-400 font-mono text-[11px]">
                          Text: "{order.customization.customText}"
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 font-semibold">Quantity & Price</span>
                      <p className="font-medium text-slate-800 dark:text-neutral-200">
                        {order.quantity} unit(s) @ {formatINR(order.unit_price)}
                      </p>
                      <p className="font-bold text-sm text-cyan-700 dark:text-cyan-400">
                        Total: {formatINR(order.total_amount)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 font-semibold">Payment Reference</span>
                      <p className="font-mono text-slate-800 dark:text-neutral-300 text-[11px] truncate">
                        {order.payment?.transaction_id || order.payment?.upi_id || 'Pending UPI Details'}
                      </p>
                      {order.payment?.screenshot_url && (
                        <a
                          href={order.payment.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-700 dark:text-cyan-400 hover:underline"
                        >
                          <span>View Payment Receipt</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <Link
                      to={`/track?order=${order.order_number}`}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:underline font-semibold"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Track Live Step Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <div className="flex items-center gap-2">
                      {!paymentSubmitted && (
                        <Link
                          to={`/payment/${order.id}`}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-xs rounded-lg shadow-sm transition-colors"
                        >
                          Upload UPI Proof
                        </Link>
                      )}

                      <Link
                        to="/order"
                        state={{
                          productId: order.product_id,
                          selectedColor: order.customization?.selectedColor,
                          quantity: 1,
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-medium rounded-lg border border-slate-300 dark:border-neutral-700 transition-colors shadow-sm"
                      >
                        Reorder Item
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
