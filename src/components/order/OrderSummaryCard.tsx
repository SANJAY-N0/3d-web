import React from 'react';
import { Product, CustomizationData, Customer } from '../../types';
import { formatINR } from '../../lib/upiUtils';
import { Box, User, Phone, MapPin } from 'lucide-react';

interface OrderSummaryCardProps {
  product: Product;
  quantity: number;
  customization?: CustomizationData;
  customer?: Partial<Customer>;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  product,
  quantity,
  customization,
  customer,
}) => {
  const total = product.price * quantity;

  return (
    <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-5 shadow-sm dark:shadow-xl">
      <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
        <Box className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Order Summary
      </h3>

      {/* Product item info */}
      <div className="flex gap-4 items-center">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-neutral-800 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{product.name}</h4>
          <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono block">
            {formatINR(product.price)} × {quantity}
          </span>
          <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-mono font-medium">
            {product.category}
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold font-display text-slate-900 dark:text-white">{formatINR(total)}</span>
        </div>
      </div>

      {/* Customization Details if provided */}
      {customization && (customization.customText || customization.selectedColor || customization.specialInstructions) && (
        <div className="bg-slate-50 dark:bg-neutral-950/60 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200 dark:border-neutral-800/80">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400 font-semibold block">
            Customization
          </span>
          {customization.customText && (
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-neutral-400">Embossed Text:</span>
              <span className="font-mono text-cyan-700 dark:text-cyan-300 font-semibold">{customization.customText}</span>
            </div>
          )}
          {customization.selectedColor && (
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-neutral-400">Color:</span>
              <span className="text-slate-900 dark:text-white font-medium">{customization.selectedColor}</span>
            </div>
          )}
          {customization.specialInstructions && (
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-neutral-400">Note:</span>
              <span className="text-slate-700 dark:text-neutral-300 truncate max-w-[200px]">{customization.specialInstructions}</span>
            </div>
          )}
        </div>
      )}

      {/* Customer Info if provided */}
      {customer?.name && (
        <div className="bg-slate-50 dark:bg-neutral-950/60 rounded-xl p-3 text-xs space-y-2 border border-slate-200 dark:border-neutral-800/80">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400 font-semibold block">
            Customer Contact
          </span>
          <div className="flex items-center gap-2 text-slate-800 dark:text-neutral-200">
            <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="font-medium truncate">{customer.name}</span>
          </div>
          {customer.phone && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-neutral-400 font-mono text-[11px]">
              <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-start gap-2 text-slate-500 dark:text-neutral-400 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{customer.address}, {customer.city || ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Total row */}
      <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex justify-between items-center">
        <span className="text-xs font-mono uppercase text-slate-500 dark:text-neutral-400 font-medium">Total Payable (UPI)</span>
        <span className="text-xl font-bold font-display text-cyan-600 dark:text-cyan-400">{formatINR(total)}</span>
      </div>
    </div>
  );
};
