import React, { useRef } from 'react';
import {
  CheckCircle2,
  Printer,
  Download,
  PlusCircle,
  X,
  Receipt,
  Phone,
  User,
  Clock,
  Box,
} from 'lucide-react';
import { PosBillResponse } from '../../types';
import { formatINR } from '../../lib/upiUtils';

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  billData: PosBillResponse | null;
  onNewBill: () => void;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  isOpen,
  onClose,
  billData,
  onNewBill,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !billData) return null;

  const { bill_number, order, payment, items, summary } = billData;
  const now = new Date(order.created_at || Date.now());
  const formattedDate = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const lines = [
      '========================================',
      '             PRINTLAB 3D                ',
      '         POS BILLING COUNTER            ',
      '========================================',
      `Bill No    : ${bill_number}`,
      `Order No   : ${order.order_number}`,
      `Date & Time: ${formattedDate} ${formattedTime}`,
      `Customer   : ${order.customer_name || 'Walk-in Customer'}`,
      `Mobile     : ${order.customer_mobile || 'N/A'}`,
      '----------------------------------------',
      'ITEMS:',
      ...items.map(
        (it) =>
          `${it.product_name}\n  ${it.quantity} x ₹${it.unit_price} = ₹${it.total_price}`
      ),
      '----------------------------------------',
      `Subtotal    : ₹${summary.subtotal.toFixed(2)}`,
      ...(summary.discount > 0 ? [`Discount    : -₹${summary.discount.toFixed(2)}`] : []),
      ...(summary.tax > 0 ? [`Tax         : +₹${summary.tax.toFixed(2)}`] : []),
      `TOTAL PAID  : ₹${summary.total_amount.toFixed(2)}`,
      '----------------------------------------',
      `Payment     : ${order.payment_method} (${order.payment_status})`,
      ...(payment?.transaction_id ? [`Ref / TxID  : ${payment.transaction_id}`] : []),
      ...(summary.cash_received !== undefined && order.payment_method === 'CASH'
        ? [
            `Cash Given  : ₹${summary.cash_received.toFixed(2)}`,
            `Change      : ₹${(summary.change_amount || 0).toFixed(2)}`,
          ]
        : []),
      '========================================',
      '        Thank you for visiting!         ',
      '========================================',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bill_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="px-5 py-3.5 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-sm tracking-wide">✓ BILL COMPLETED</h3>
              <p className="text-[11px] text-white/90 font-mono">
                {bill_number} • {order.order_number}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          <div
            ref={receiptRef}
            className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 space-y-3 font-mono"
          >
            {/* Header info */}
            <div className="text-center border-b border-dashed border-slate-300 dark:border-neutral-800 pb-2.5">
              <h2 className="font-bold text-sm tracking-wider text-slate-900 dark:text-white">PRINTLAB 3D</h2>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400">POS Billing Counter Receipt</p>
              <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-neutral-400">
                <span>{formattedDate}</span>
                <span>•</span>
                <span>{formattedTime}</span>
              </div>
            </div>

            {/* Bill & Customer Details */}
            <div className="text-[11px] space-y-1 border-b border-dashed border-slate-300 dark:border-neutral-800 pb-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Bill No:</span>
                <span className="font-bold text-slate-900 dark:text-white">{bill_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="text-slate-900 dark:text-white">{order.customer_name || 'Walk-in Customer'}</span>
              </div>
              {order.customer_mobile && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="text-slate-900 dark:text-white">{order.customer_mobile}</span>
                </div>
              )}
            </div>

            {/* Itemized Table */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 dark:border-neutral-800 pb-2.5">
              <div className="flex justify-between text-[10px] text-slate-400 uppercase font-semibold">
                <span>Item</span>
                <span>Qty x Price</span>
                <span>Total</span>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <span className="text-slate-800 dark:text-neutral-200 truncate max-w-[140px]">
                    {it.product_name}
                  </span>
                  <span className="text-slate-500">
                    {it.quantity} × {formatINR(it.unit_price)}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatINR(it.total_price)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 dark:border-neutral-800 pb-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span>{formatINR(summary.subtotal)}</span>
              </div>
              {summary.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{formatINR(summary.discount)}</span>
                </div>
              )}
              {summary.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax:</span>
                  <span>+{formatINR(summary.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-cyan-600 dark:text-cyan-400 pt-1 border-t border-slate-200 dark:border-neutral-800">
                <span>PAYABLE TOTAL:</span>
                <span>{formatINR(summary.total_amount)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="text-[10px] space-y-0.5 text-slate-500 dark:text-neutral-400">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{order.payment_method}</span>
              </div>
              {payment?.transaction_id && (
                <div className="flex justify-between">
                  <span>TxID / Ref:</span>
                  <span className="truncate max-w-[160px]">{payment.transaction_id}</span>
                </div>
              )}
              {order.payment_method === 'CASH' && summary.cash_received !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span>Cash Received:</span>
                    <span>{formatINR(summary.cash_received)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Change Returned:</span>
                    <span>{formatINR(summary.change_amount || 0)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-center pt-2 text-[10px] text-slate-400">
              Thank you for choosing PRINTLAB 3D!
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs uppercase"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-500" />
              <span>PRINT BILL</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs uppercase"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>DOWNLOAD RECEIPT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNewBill();
              }}
              className="py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 active:scale-98 transition-all cursor-pointer text-xs uppercase"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>NEW BILL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};
