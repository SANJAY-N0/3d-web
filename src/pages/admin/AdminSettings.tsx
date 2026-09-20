import React, { useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { DEFAULT_UPI_ID } from '../../lib/upiUtils';
import { resetAllStorageToSeed } from '../../services/productService';
import {
  Settings,
  QrCode,
  Database,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const AdminSettings: React.FC = () => {
  const { showToast } = useToast();
  const [upiId, setUpiId] = useState(
    () => localStorage.getItem('printlab_merchant_upi_id') || DEFAULT_UPI_ID
  );
  const [merchantName, setMerchantName] = useState(
    () => localStorage.getItem('printlab_merchant_name') || 'PRINTLAB 3D'
  );

  const handleSaveUPI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim()) {
      showToast('UPI ID cannot be empty.', 'error');
      return;
    }
    localStorage.setItem('printlab_merchant_upi_id', upiId.trim());
    localStorage.setItem('printlab_merchant_name', merchantName.trim());
    showToast('Merchant UPI configuration saved successfully!', 'success');
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo products and orders to original seed state?')) {
      resetAllStorageToSeed();
      showToast('Reset data to default catalog!', 'success');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const sqlSchemaSnippet = `-- Supabase Table Schema
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  material TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  print_time TEXT NOT NULL,
  available_colors JSONB DEFAULT '[]',
  image_url TEXT NOT NULL,
  gallery_urls JSONB DEFAULT '[]',
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">System Settings & UPI Gateway</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure merchant UPI credentials, Supabase database storage, and system backups.
          </p>
        </div>

        {/* Section 1: Merchant UPI Configuration */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Merchant UPI Receiving Details</h2>
              <p className="text-xs text-neutral-400">
                This UPI ID is dynamically encoded into payment QR codes and deep links for customers.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveUPI} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300">Merchant UPI VPA Handle *</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. printlab3d@okhdfcbank"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white font-mono"
                />
                <span className="text-[11px] text-neutral-500">Supports GPay, PhonePe, Paytm, BHIM VPAs</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300">Payee Display Name</label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="PRINTLAB 3D"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-cyan-500/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save UPI Settings</span>
            </button>
          </form>
        </div>

        {/* Section 2: Supabase Backend Status */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-white">Database & Persistence Engine</h2>
                <p className="text-xs text-neutral-400">
                  Supabase PostgreSQL + Storage integration status
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 border ${
                  isSupabaseConfigured
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                }`}
              >
                {isSupabaseConfigured ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Supabase Connected</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Local Dual-Persistence Active</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-neutral-300">
            <p className="leading-relaxed">
              PRINTLAB 3D includes automatic **Dual-Mode Persistence**: All products, orders, customer records, and payment submissions are stored with instant client and cloud synchronization. When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided in `.env`, all operations automatically sync to your Supabase PostgreSQL cluster.
            </p>

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-400 space-y-1">
              <div className="text-white font-semibold flex items-center justify-between">
                <span>Database Migration Schema (`supabase/schema.sql`)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sqlSchemaSnippet);
                    showToast('SQL schema copied to clipboard!', 'success');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-xs"
                >
                  <Copy className="w-3 h-3" /> Copy SQL
                </button>
              </div>
              <p className="text-neutral-500">
                Contains complete DDL scripts for `products`, `customers`, `orders`, `payments`, `admins` tables, RLS security policies, and Supabase Storage bucket configuration.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Data Maintenance */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Catalog & Mock Data Reset</h2>
              <p className="text-xs text-neutral-400">
                Restore the default 3D product catalog and sample order state for testing or demonstration.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-neutral-400 max-w-md">
              Clears local modifications and reloads the default 3D products (Keychains, Hexagon Planters, Miniatures, Articulated Stands).
            </p>

            <button
              onClick={handleResetData}
              className="px-5 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Seed Data</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
