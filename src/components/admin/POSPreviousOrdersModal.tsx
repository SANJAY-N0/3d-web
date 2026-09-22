import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Receipt,
  Calendar,
  DollarSign,
  CreditCard,
  Eye,
  RefreshCw,
  Box,
} from 'lucide-react';
import { Order } from '../../types';
import { orderService } from '../../services/orderService';
import { formatINR } from '../../lib/upiUtils';
import { StatusBadge } from '../common/StatusBadge';

interface POSPreviousOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBill: (order: Order) => void;
}

export const POSPreviousOrdersModal: React.FC<POSPreviousOrdersModalProps> = ({
  isOpen,
  onClose,
  onSelectBill,
}) => {
  const [bills, setBills] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBills = async () => {
    setLoading(true);
    try {
      const data = await orderService.getPosBills();
      setBills(data);
    } catch (err) {
      console.warn('Failed to load previous POS bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBills();
    }
  }, [isOpen]);

  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return bills;
    const q = searchQuery.toLowerCase().trim();
    return bills.filter((b) => {
      const billNum = ((b.customization as any)?.bill_number || '').toLowerCase();
      const orderNum = b.order_number.toLowerCase();
      const custName = (b.customer_name || b.customer?.name || '').toLowerCase();
      const custMobile = (b.customer_mobile || b.customer?.phone || '').toLowerCase();
      return (
        billNum.includes(q) ||
        orderNum.includes(q) ||
        custName.includes(q) ||
        custMobile.includes(q)
      );
    });
  }, [bills, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Previous Orders & Bills</h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                History of completed counter bills
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchBills}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-500 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-neutral-800/80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bill #, order #, or customer..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>
        </div>

        {/* Bills List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {loading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 animate-pulse flex justify-between items-center">
                  <div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Box className="w-8 h-8 mx-auto text-slate-300 dark:text-neutral-700" />
              <p className="text-xs">No previous bills found.</p>
            </div>
          ) : (
            filteredBills.map((bill) => {
              const billNum = (bill.customization as any)?.bill_number || bill.order_number;
              const isCash = bill.payment_method === 'CASH';

              return (
                <div
                  key={bill.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 hover:border-cyan-300 dark:hover:border-cyan-800 transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {billNum}
                      </span>
                      <span className={`px-2 py-0.2 rounded-full font-mono text-[10px] font-semibold ${
                        isCash
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                      }`}>
                        {bill.payment_method}
                      </span>
                      <StatusBadge status={bill.order_status} type="order" size="sm" />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
                      <span>{bill.customer_name || bill.customer?.name || 'Walk-in Customer'}</span>
                      <span>•</span>
                      <span className="font-mono">
                        {new Date(bill.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })} at {new Date(bill.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400">
                      {formatINR(bill.total_amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectBill(bill)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
