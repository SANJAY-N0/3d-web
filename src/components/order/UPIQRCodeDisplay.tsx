import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildUPIUri, formatINR, getMerchantUPIConfig } from '../../lib/upiUtils';
import { useToast } from '../common/Toast';
import { Copy, Check, QrCode, Smartphone, ExternalLink } from 'lucide-react';

interface UPIQRCodeDisplayProps {
  amount: number;
  orderNumber: string;
  productName: string;
  upiId?: string;
}

export const UPIQRCodeDisplay: React.FC<UPIQRCodeDisplayProps> = ({
  amount,
  orderNumber,
  productName,
  upiId,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const merchantConfig = getMerchantUPIConfig();
  const activeUpiId = upiId || merchantConfig.upiId;

  const upiUri = buildUPIUri({
    upiId: activeUpiId,
    businessName: merchantConfig.businessName,
    amount,
    orderNumber,
    note: `PrintLab 3D Order ${orderNumber}`,
  });

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(activeUpiId);
    setCopied(true);
    showToast(`Copied UPI ID: ${activeUpiId}`, 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
      {/* Amount Header */}
      <div className="text-center pb-4 border-b border-slate-200 dark:border-neutral-800/80">
        <span className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-neutral-400 font-medium">Total Amount to Pay</span>
        <div className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white mt-1 flex items-center justify-center gap-1">
          <span className="text-cyan-600 dark:text-cyan-400">{formatINR(amount)}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
          Order Ref: <span className="font-mono text-cyan-700 dark:text-cyan-300 font-semibold">{orderNumber}</span>
        </p>
      </div>

      {/* UPI QR Code Container */}
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="p-4 bg-white rounded-2xl shadow-xl shadow-cyan-500/10 border-4 border-slate-200 dark:border-neutral-800 relative group">
          <QRCodeSVG
            value={upiUri}
            size={200}
            level="H"
            includeMargin={true}
          />
          <div className="absolute inset-0 rounded-xl bg-cyan-500/5 pointer-events-none" />
        </div>

        <p className="text-xs font-mono text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Scan with any UPI app on phone
        </p>

        {/* Direct Mobile Pay CTA (Deep Link) */}
        <a
          href={upiUri}
          className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-300 dark:border-neutral-700 transition-all active:scale-95 shadow-sm"
        >
          <Smartphone className="w-4 h-4" />
          <span>Pay with Installed UPI App</span>
          <ExternalLink className="w-3 h-3 text-slate-400 dark:text-neutral-400" />
        </a>
      </div>

      {/* Copy UPI ID Bar */}
      <div className="bg-slate-50 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col text-center sm:text-left">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400 font-semibold">Official Merchant UPI ID</span>
          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white select-all">{activeUpiId}</span>
        </div>

        <button
          type="button"
          onClick={handleCopyUPI}
          className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-white dark:bg-neutral-800 hover:bg-cyan-600 hover:text-white text-slate-800 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 shadow-sm'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy UPI ID'}</span>
        </button>
      </div>

      {/* Supported Apps Logos/Text */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block text-center uppercase tracking-wider font-semibold">
          Supported UPI Apps
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-slate-700 dark:text-neutral-300">
          <span className="bg-white dark:bg-neutral-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-neutral-800 shadow-sm">Google Pay</span>
          <span className="bg-white dark:bg-neutral-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-neutral-800 shadow-sm">PhonePe</span>
          <span className="bg-white dark:bg-neutral-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-neutral-800 shadow-sm">Paytm UPI</span>
          <span className="bg-white dark:bg-neutral-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-neutral-800 shadow-sm">BHIM UPI</span>
          <span className="bg-white dark:bg-neutral-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-neutral-800 shadow-sm">Cred / Any App</span>
        </div>
      </div>

      {/* Step Instructions */}
      <div className="bg-slate-50 dark:bg-neutral-950/60 rounded-xl p-4 border border-slate-200 dark:border-neutral-800/80 text-xs space-y-2 text-slate-600 dark:text-neutral-400">
        <span className="font-semibold text-slate-800 dark:text-neutral-200 block text-[11px] font-mono uppercase tracking-wider">
          Payment Process:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">1</span>
            <span>Open your UPI app & scan the QR or paste UPI ID.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">2</span>
            <span>Pay exact amount of <b className="text-slate-900 dark:text-white">{formatINR(amount)}</b>.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">3</span>
            <span>Take screenshot OR copy the 12-digit UPI Ref/UTR ID.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">4</span>
            <span>Submit proof below for stall admin verification.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
