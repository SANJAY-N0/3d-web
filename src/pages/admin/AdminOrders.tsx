import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OrderDetailsModal } from '../../components/admin/OrderDetailsModal';
import { orderService } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';
import { Order, OrderStatus } from '../../types';
import { formatINR } from '../../lib/upiUtils';
import {
  Search,
  Download,
  Filter,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const AdminOrders: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await orderService.getAll();
      setOrders(data);
    } catch (err: any) {
      showToast('Failed to fetch orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    if (status === 'ALL') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING_PAYMENT_VERIFICATION') {
          const isPending =
            o.order_status === 'PENDING_PAYMENT_VERIFICATION' ||
            (o.payment?.payment_status === 'SUBMITTED' && o.order_status === 'PENDING_PAYMENT');
          if (!isPending) return false;
        } else if (o.order_status !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = o.order_number.toLowerCase().includes(q);
        const matchName = o.customer?.name.toLowerCase().includes(q) || false;
        const matchPhone = o.customer?.phone.toLowerCase().includes(q) || false;
        const matchTx = o.payment?.transaction_id?.toLowerCase().includes(q) || false;
        const matchProd = o.product?.name.toLowerCase().includes(q) || false;
        if (!matchNum && !matchName && !matchPhone && !matchTx && !matchProd) return false;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const handleVerifyPayment = async (
    orderId: string,
    status: 'VERIFIED' | 'REJECTED' | 'PENDING_REVIEW',
    notes?: string
  ) => {
    await paymentService.verifyPayment(orderId, status, 'admin-user', notes);
    await loadOrders();
    if (selectedOrder && selectedOrder.id === orderId) {
      const updated = await orderService.getById(orderId);
      setSelectedOrder(updated);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await orderService.updateStatus(orderId, status);
    await loadOrders();
    if (selectedOrder && selectedOrder.id === orderId) {
      const updated = await orderService.getById(orderId);
      setSelectedOrder(updated);
    }
  };

  const handleExportCSV = () => {
    if (orders.length === 0) {
      showToast('No orders to export.', 'info');
      return;
    }

    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Phone',
      'Product',
      'Qty',
      'Total (INR)',
      'Payment Status',
      'Order Status',
      'UPI Ref / UTR',
      'OCR Confidence',
      'UPI Match',
      'Amount Match',
      'Admin Notes',
    ];
    const rows = filteredOrders.map((o) => [
      o.order_number,
      new Date(o.created_at).toISOString(),
      `"${o.customer?.name || ''}"`,
      `"${o.customer?.phone || ''}"`,
      `"${o.product?.name || ''}"`,
      o.quantity,
      o.total_amount,
      o.payment?.payment_status || 'PENDING',
      o.order_status,
      `"${o.payment?.transaction_id || ''}"`,
      o.payment?.ocr_confidence ? `${Math.round(o.payment.ocr_confidence * 100)}%` : 'N/A',
      o.payment?.upi_match ? 'YES' : 'NO',
      o.payment?.amount_match ? 'YES' : 'NO',
      `"${o.payment?.admin_notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `printlab_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV export downloaded!', 'success');
  };

  const filterTabs = [
    { key: 'ALL', label: 'All Orders' },
    { key: 'PENDING_PAYMENT_VERIFICATION', label: 'Pending Verification', badge: true },
    { key: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
    { key: 'PRINTING', label: '3D Printing' },
    { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  const pendingVerificationCount = orders.filter(
    (o) =>
      o.order_status === 'PENDING_PAYMENT_VERIFICATION' ||
      (o.payment?.payment_status === 'SUBMITTED' && o.order_status === 'PENDING_PAYMENT')
  ).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">Order & Payment Management</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Verify customer UPI submissions, change production stages, and export data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadOrders}
              className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {filterTabs.map((tab) => {
            const isSelected = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleStatusFilterChange(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold shadow-md'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && pendingVerificationCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-bold">
                    {pendingVerificationCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, Customer Name, Phone, UTR..."
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        {/* Orders Table Card */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 text-neutral-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="pb-3 px-3">Order Ref</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Customer Contact</th>
                  <th className="pb-3 px-3">Product Item</th>
                  <th className="pb-3 px-3">Payable</th>
                  <th className="pb-3 px-3">Payment Proof</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-4 px-3 font-mono text-white font-semibold whitespace-nowrap">
                      {ord.order_number}
                    </td>

                    <td className="py-4 px-3 text-neutral-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(ord.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="font-semibold text-white">{ord.customer?.name || 'Customer'}</div>
                      <div className="text-[11px] text-cyan-400 font-mono">{ord.customer?.phone}</div>
                      {ord.customer?.college && (
                        <div className="text-[10px] text-neutral-400 truncate max-w-[140px]">{ord.customer.college}</div>
                      )}
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="text-neutral-200 font-medium truncate max-w-[160px]">{ord.product?.name || '3D Product'}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        Qty: {ord.quantity} {ord.customization?.selectedColor ? `• ${ord.customization.selectedColor}` : ''}
                      </div>
                    </td>

                    <td className="py-4 px-3 font-mono text-cyan-400 font-bold whitespace-nowrap">
                      {formatINR(ord.total_amount)}
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <StatusBadge status={ord.payment?.payment_status || 'PENDING'} type="payment" size="sm" />
                        {ord.payment?.transaction_id && (
                          <div className="font-mono text-[10px] text-neutral-400 truncate max-w-[120px]">
                            UTR: {ord.payment.transaction_id}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap">
                      <StatusBadge status={ord.order_status} type="order" size="sm" />
                    </td>

                    <td className="py-4 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedOrder(ord);
                          setIsModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-neutral-700"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Inspect & Verify</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredOrders.length === 0 && !loading && (
              <div className="p-12 text-center text-neutral-400 space-y-2">
                <p className="font-mono text-sm">No orders found matching the filter criteria.</p>
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Clear search & filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details & Verification Modal */}
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
