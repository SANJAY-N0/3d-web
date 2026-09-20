import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OrderDetailsModal } from '../../components/admin/OrderDetailsModal';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { paymentService } from '../../services/paymentService';
import { Order, Product, OrderStatus } from '../../types';
import { formatINR } from '../../lib/upiUtils';
import {
  ShoppingBag,
  Clock,
  IndianRupee,
  Box,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [orderList, prodList] = await Promise.all([
        orderService.getAll(),
        productService.getAll(),
      ]);
      setOrders(orderList);
      setProducts(prodList);
    } catch (err: any) {
      showToast('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute metrics
  const totalOrders = orders.length;
  const pendingVerificationCount = orders.filter(
    (o) =>
      o.order_status === 'PENDING_PAYMENT_VERIFICATION' ||
      (o.payment?.payment_status === 'SUBMITTED' && o.order_status === 'PENDING_PAYMENT')
  ).length;

  const verifiedRevenue = orders
    .filter((o) => o.payment?.payment_status === 'VERIFIED' || o.order_status === 'PAYMENT_VERIFIED' || o.order_status === 'PRINTING' || o.order_status === 'COMPLETED' || o.order_status === 'READY_FOR_PICKUP')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const activePrintingCount = orders.filter((o) => o.order_status === 'PRINTING').length;

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleVerifyPayment = async (
    orderId: string,
    status: 'VERIFIED' | 'REJECTED' | 'PENDING_REVIEW',
    notes?: string
  ) => {
    await paymentService.verifyPayment(orderId, status, 'admin-user', notes);
    await loadDashboardData();
    if (selectedOrder && selectedOrder.id === orderId) {
      const updated = await orderService.getById(orderId);
      setSelectedOrder(updated);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await orderService.updateStatus(orderId, status);
    await loadDashboardData();
    if (selectedOrder && selectedOrder.id === orderId) {
      const updated = await orderService.getById(orderId);
      setSelectedOrder(updated);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">Operations Dashboard</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Live orders, manual UPI payment verification queue, and 3D print management.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboardData}
              className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              to="/admin/products"
              className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add 3D Product</span>
            </Link>

            <Link
              to="/admin/orders"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Action Alert if Pending Verifications exist */}
        {pendingVerificationCount > 0 && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">
                  {pendingVerificationCount} UPI Payment{pendingVerificationCount > 1 ? 's' : ''} Awaiting Manual Verification!
                </h4>
                <p className="text-xs text-amber-300/80">
                  Customers have uploaded transfer proof or reference IDs for verification.
                </p>
              </div>
            </div>

            <Link
              to="/admin/orders?status=PENDING_PAYMENT_VERIFICATION"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors shrink-0"
            >
              Review Verification Queue →
            </Link>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Orders"
            value={totalOrders}
            subtitle="Lifetime orders recorded"
            icon={ShoppingBag}
            accent="indigo"
          />

          <StatCard
            title="Pending Verification"
            value={pendingVerificationCount}
            subtitle="Manual UPI proofs to check"
            icon={Clock}
            accent={pendingVerificationCount > 0 ? 'amber' : 'cyan'}
          />

          <StatCard
            title="Verified Revenue"
            value={formatINR(verifiedRevenue)}
            subtitle="From verified UPI payments"
            icon={IndianRupee}
            accent="emerald"
          />

          <StatCard
            title="Active Catalog"
            value={products.length}
            subtitle={`${activePrintingCount} currently in 3D print queue`}
            icon={Box}
            accent="cyan"
          />
        </div>

        {/* Recent Orders Section */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <h2 className="font-display font-bold text-lg text-white">Recent Customer Orders</h2>
              <p className="text-xs text-neutral-400">Showing latest orders submitted through the portal</p>
            </div>

            <Link to="/admin/orders" className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1">
              <span>View full list</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 text-neutral-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="pb-3 px-3">Order Ref</th>
                  <th className="pb-3 px-3">Customer</th>
                  <th className="pb-3 px-3">Product</th>
                  <th className="pb-3 px-3">Amount</th>
                  <th className="pb-3 px-3">Payment</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {orders.slice(0, 6).map((ord) => (
                  <tr key={ord.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-white font-semibold whitespace-nowrap">
                      {ord.order_number}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-medium text-white">{ord.customer?.name || 'Customer'}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">{ord.customer?.phone}</div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="text-neutral-200 truncate max-w-[150px]">{ord.product?.name || '3D Product'}</div>
                      <div className="text-[10px] text-cyan-400 font-mono">Qty: {ord.quantity}</div>
                    </td>

                    <td className="py-3.5 px-3 font-mono text-white font-bold whitespace-nowrap">
                      {formatINR(ord.total_amount)}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={ord.payment?.payment_status || 'PENDING'} type="payment" size="sm" />
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={ord.order_status} type="order" size="sm" />
                    </td>

                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenOrder(ord)}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors border border-neutral-700"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && !loading && (
              <div className="p-8 text-center text-neutral-500 font-mono text-xs">
                No orders recorded yet. Placed orders will appear here in real time.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Inspector Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onVerifyPayment={handleVerifyPayment}
        onUpdateOrderStatus={handleUpdateOrderStatus}
      />
    </AdminLayout>
  );
};
