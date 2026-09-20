import React from 'react';
import { Phone, MessageSquare, HelpCircle } from 'lucide-react';
import { getSupportConfig, getWhatsAppLink } from '../../lib/supportConfig';

interface CustomerSupportCardProps {
  orderNumber?: string;
  className?: string;
}

export const CustomerSupportCard: React.FC<CustomerSupportCardProps> = ({ orderNumber, className = '' }) => {
  const support = getSupportConfig();
  const whatsappMsg = orderNumber
    ? `Hello PrintLab 3D! I need help regarding my order #${orderNumber}.`
    : 'Hello PrintLab 3D! I have an enquiry about 3D printing orders.';
  const whatsappUrl = getWhatsAppLink(support.whatsapp, whatsappMsg);

  return (
    <div className={`p-5 rounded-3xl bg-slate-50 dark:bg-neutral-900/70 border border-slate-200 dark:border-neutral-800 space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-display font-semibold text-sm">
        <HelpCircle className="w-4 h-4" />
        <span>Need Help?</span>
      </div>

      <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
        For orders, product enquiries or custom 3D-printing requests:
      </p>

      <div className="space-y-2.5 text-xs">
        {/* Call Primary */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Phone className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-neutral-500 font-semibold">Call</span>
              <a
                href={`tel:${support.phone.replace(/\s+/g, '')}`}
                className="font-mono text-slate-800 dark:text-neutral-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-medium"
              >
                {support.phone}
              </a>
            </div>
          </div>

          <a
            href={`tel:${support.phone.replace(/\s+/g, '')}`}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-[11px] font-mono transition-colors"
          >
            Call
          </a>
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-neutral-500 font-semibold">WhatsApp</span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-slate-800 dark:text-neutral-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
              >
                {support.whatsapp}
              </a>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <span>💬 WhatsApp Support</span>
          </a>
        </div>

        {/* Alternative Phone (Only if configured by admin) */}
        {support.altPhone && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Phone className="w-3.5 h-3.5" />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-neutral-500 font-semibold">Alternative</span>
                <a
                  href={`tel:${support.altPhone.replace(/\s+/g, '')}`}
                  className="font-mono text-slate-800 dark:text-neutral-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  {support.altPhone}
                </a>
              </div>
            </div>

            <a
              href={`tel:${support.altPhone.replace(/\s+/g, '')}`}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-[11px] font-mono transition-colors"
            >
              Call
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
