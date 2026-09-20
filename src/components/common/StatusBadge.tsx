import React from 'react';
import { OrderStatus, PaymentStatus } from '../../types';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Printer,
  PackageCheck,
  Check,
  XCircle,
  Truck,
  Box,
  CreditCard,
} from 'lucide-react';

interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus | string;
  type?: 'order' | 'payment';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'order', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs';

  if (type === 'payment') {
    switch (status as PaymentStatus) {
      case 'PENDING':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClasses}`}>
            <Clock className="w-3 h-3" />
            Payment Pending
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 ${sizeClasses}`}>
            <Clock className="w-3 h-3 animate-pulse" />
            Proof Submitted
          </span>
        );
      case 'VERIFIED':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}>
            <Check className="w-3 h-3" />
            Payment Verified
          </span>
        );
      case 'REJECTED':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 ${sizeClasses}`}>
            <XCircle className="w-3 h-3" />
            Payment Rejected
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 ${sizeClasses}`}>
            <AlertTriangle className="w-3 h-3" />
            Flagged for Review
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 ${sizeClasses}`}>
            <CreditCard className="w-3 h-3" />
            {String(status || 'Pending').replace(/_/g, ' ')}
          </span>
        );
    }
  }

  // Order status handling (6-stage tracker + legacy)
  switch (status as OrderStatus) {
    case 'ORDER_PLACED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClasses}`}>
          <Box className="w-3 h-3" />
          Order Placed
        </span>
      );
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_VERIFIED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}>
          <CheckCircle className="w-3 h-3" />
          Payment Confirmed
        </span>
      );
    case 'ORDER_PROCESSING':
    case 'PRINTING':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ${sizeClasses}`}>
          <Printer className="w-3 h-3 animate-bounce" />
          In Production (3D Printing)
        </span>
      );
    case 'PRODUCT_READY':
    case 'READY_FOR_PICKUP':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 ${sizeClasses}`}>
          <PackageCheck className="w-3 h-3" />
          Ready for Pickup
        </span>
      );
    case 'OUT_FOR_DELIVERY':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 ${sizeClasses}`}>
          <Truck className="w-3 h-3 animate-pulse" />
          Out for Delivery
        </span>
      );
    case 'DELIVERED':
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 ${sizeClasses}`}>
          <Check className="w-3 h-3" />
          Delivered
        </span>
      );
    case 'PENDING_PAYMENT':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClasses}`}>
          <Clock className="w-3 h-3" />
          Awaiting Payment
        </span>
      );
    case 'PENDING_PAYMENT_VERIFICATION':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 ${sizeClasses}`}>
          <AlertTriangle className="w-3 h-3" />
          Pending Verification
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 ${sizeClasses}`}>
          <XCircle className="w-3 h-3" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 ${sizeClasses}`}>
          <Box className="w-3 h-3" />
          {String(status || 'Processing').replace(/_/g, ' ')}
        </span>
      );
  }
};
