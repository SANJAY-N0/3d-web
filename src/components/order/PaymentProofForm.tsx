import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  FileCheck,
  Check,
} from 'lucide-react';
import { formatINR, UPI_CONFIG } from '../../lib/upiUtils';
import { paymentService, OCRAnalysisResponse } from '../../services/paymentService';
import { PaymentAnalysis } from '../../types';

interface PaymentProofFormProps {
  amount: number;
  expectedUpiId?: string;
  orderNumber?: string;
  orderId?: string;
  isSubmitting: boolean;
  onSubmit: (data: {
    transactionId: string;
    screenshotFile: File | null;
    screenshotPreview: string | null;
    analysis?: PaymentAnalysis;
  }) => void;
}

export const PaymentProofForm: React.FC<PaymentProofFormProps> = ({
  amount,
  expectedUpiId = UPI_CONFIG.upiId,
  orderNumber = '3DP-ORDER',
  orderId,
  isSubmitting,
  onSubmit,
}) => {
  // UTR / Transaction ID (Starts empty, never automatically filled)
  const [transactionId, setTransactionId] = useState('');

  // Payment Screenshot state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRAnalysisResponse | null>(null);

  const fileUploadRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setErrorMessage(null);

    // Validate size (< 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds 10MB. Please choose a smaller image.');
      return;
    }

    // Validate format
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Please upload a valid image file (JPG, JPEG, PNG, or WebP).');
      return;
    }

    setScreenshotFile(file);

    // Read base64 for preview & OCR analysis
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setScreenshotPreview(base64Data);

      // Trigger background verification scan (for validation only, do NOT autofill transactionId)
      setIsScanning(true);
      try {
        const analysis = await paymentService.analyzeScreenshot({
          imageBase64: base64Data,
          mimeType: file.type,
          expectedUpiId,
          expectedAmount: amount,
          orderNumber,
          orderId,
        });

        setOcrResult(analysis);
        // Note: Automatic UTR autofill is intentionally REMOVED as per TASK 12.
        // Customer enters their transaction ID manually.
      } catch (err: any) {
        console.warn('Verification scan finished with fallback:', err);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveFile = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setOcrResult(null);
    if (fileUploadRef.current) fileUploadRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTx = transactionId.trim();
    const cleanTx = trimmedTx.replace(/\s+/g, '');

    // 1. Validate UTR / Transaction ID (Mandatory 12-digit reference)
    if (!trimmedTx) {
      setErrorMessage('Please enter the UPI Transaction ID / UTR from your payment receipt.');
      return;
    }

    if (cleanTx.length < 12) {
      setErrorMessage('UPI Transaction ID / UTR must be at least 12 digits (e.g. 423456789012).');
      return;
    }

    // 2. Validate screenshot if attached
    if (screenshotFile) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(screenshotFile.type.toLowerCase())) {
        setErrorMessage('Please provide a valid image format (JPG, JPEG, PNG, or WebP).');
        return;
      }
    }

    onSubmit({
      transactionId: trimmedTx,
      screenshotFile,
      screenshotPreview,
      analysis: ocrResult || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl backdrop-blur-sm"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
            Payment Confirmation
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-neutral-400">
          Upload your payment screenshot and enter the UPI Transaction ID to confirm your order.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Payment Screenshot Section */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-slate-800 dark:text-neutral-200 font-sans">
          Payment Screenshot
        </label>

        {!screenshotPreview ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => fileUploadRef.current?.click()}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Upload Screenshot</span>
              </button>

              <span className="text-xs font-medium text-slate-400 dark:text-neutral-500 font-mono lowercase">
                or
              </span>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Take Photo</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-neutral-400 text-center sm:text-left">
              Accepts JPG, JPEG, PNG, or WebP (max 10MB).
            </p>

            <input
              ref={fileUploadRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Screenshot preview bar */}
            <div className="relative rounded-2xl border border-cyan-500/40 bg-slate-50 dark:bg-neutral-950 p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative">
                  <img
                    src={screenshotPreview}
                    alt="Payment proof preview"
                    className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-neutral-800 shrink-0"
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-cyan-950/80 rounded-xl flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                    {screenshotFile?.name || 'UPI_Payment_Screenshot.jpg'}
                  </span>
                  {screenshotFile && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block">
                      {(screenshotFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                  {isScanning ? (
                    <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono flex items-center gap-1 mt-0.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Verifying screenshot...
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                      <Check className="w-3 h-3" /> Ready to upload
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Transaction ID Input (No Autofill) */}
      <div className="space-y-1.5">
        <label htmlFor="tx-id" className="block text-xs font-semibold text-slate-800 dark:text-neutral-200 font-sans">
          UPI Transaction ID / UTR <span className="text-rose-500">*</span>
        </label>

        <input
          id="tx-id"
          type="text"
          required
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value.trim())}
          placeholder="Enter Transaction ID"
          className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
          <span>Enter or paste the 12-digit UPI reference ID from Google Pay, PhonePe, or Paytm.</span>
          {transactionId && (
            <span className="text-cyan-600 dark:text-cyan-400 font-mono font-medium">{transactionId.length} chars</span>
          )}
        </div>
      </div>

      {/* Order Amount Display */}
      <div className="p-3.5 bg-slate-50 dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-neutral-800/80 flex items-center justify-between text-xs font-mono">
        <div className="space-y-0.5">
          <span className="text-slate-600 dark:text-neutral-400 block">Total Amount to Pay:</span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-500">UPI ID: {expectedUpiId}</span>
        </div>
        <span className="text-cyan-700 dark:text-cyan-400 font-bold font-display text-base">{formatINR(amount)}</span>
      </div>

      {/* Submit CTA */}
      <button
        type="submit"
        disabled={isSubmitting || isScanning}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Submitting Payment Proof...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Payment & Confirm Order</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
