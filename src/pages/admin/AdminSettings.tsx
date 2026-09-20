import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { isSupabaseConfigured } from '../../lib/supabase';
import { DEFAULT_UPI_ID, DEFAULT_BUSINESS_NAME } from '../../lib/upiUtils';
import { DEFAULT_CLOUDINARY_CLOUD_NAME, getCloudinaryCloudName, getCloudinaryDefaultFolder } from '../../lib/cloudinary';
import { DEFAULT_SUPPORT_CONFIG, getSupportConfig, getWhatsAppLink } from '../../lib/supportConfig';
import { resetAllStorageToSeed } from '../../services/productService';
import { settingsService } from '../../services/settingsService';
import {
  Settings,
  QrCode,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Save,
  Cloud,
  Lock,
  ExternalLink,
  Phone,
  MessageSquare,
  Eye,
  EyeOff,
  Headphones,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const AdminSettings: React.FC = () => {
  const { showToast } = useToast();

  // UPI Configuration State
  const [upiId, setUpiId] = useState(
    () => localStorage.getItem('printlab_merchant_upi_id') || DEFAULT_UPI_ID
  );
  const [merchantName, setMerchantName] = useState(
    () => localStorage.getItem('printlab_merchant_name') || DEFAULT_BUSINESS_NAME
  );

  // Customer Support Contact Settings State (PART 3)
  const [supportPhone, setSupportPhone] = useState(
    () => localStorage.getItem('printlab_support_phone') || DEFAULT_SUPPORT_CONFIG.phone
  );
  const [supportWhatsapp, setSupportWhatsapp] = useState(
    () => localStorage.getItem('printlab_support_whatsapp') || DEFAULT_SUPPORT_CONFIG.whatsapp
  );
  const [supportAltPhone, setSupportAltPhone] = useState(
    () => localStorage.getItem('printlab_support_alt_phone') || ''
  );

  // Cloudinary Configuration State (Name, API Key, Secret, URL, Folder)
  const [cloudName, setCloudName] = useState(
    () => getCloudinaryCloudName()
  );
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState(
    () => localStorage.getItem('printlab_cloudinary_api_key') || '873981713524356'
  );
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState(
    () => localStorage.getItem('printlab_cloudinary_api_secret') || '17qkUtU1PH-KRltAlsM0lC8KCdw'
  );
  const [showSecret, setShowSecret] = useState(false);
  const [uploadFolder, setUploadFolder] = useState(
    () => getCloudinaryDefaultFolder()
  );

  // Load latest settings from Supabase on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const allSettings = await settingsService.getAll();
        if (allSettings.merchant_upi_id) setUpiId(allSettings.merchant_upi_id);
        if (allSettings.merchant_name) setMerchantName(allSettings.merchant_name);
        if (allSettings.support_phone) setSupportPhone(allSettings.support_phone);
        if (allSettings.support_whatsapp) setSupportWhatsapp(allSettings.support_whatsapp);
        if (allSettings.support_alt_phone !== undefined) setSupportAltPhone(allSettings.support_alt_phone);
        if (allSettings.cloudinary_cloud_name) setCloudName(allSettings.cloudinary_cloud_name);
        if (allSettings.cloudinary_folder) setUploadFolder(allSettings.cloudinary_folder);
      } catch (err) {
        console.warn('Failed to load settings from Supabase:', err);
      }
    };
    loadSettings();
  }, []);

  // Supabase Safe Public Configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyzcompany.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const maskedAnonKey = supabaseAnonKey
    ? `${supabaseAnonKey.substring(0, 12)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 8)}`
    : 'Not configured';

  const handleSaveUPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim()) {
      showToast('UPI ID cannot be empty.', 'error');
      return;
    }
    await settingsService.set('merchant_upi_id', upiId.trim(), 'Merchant UPI ID for customer QR code and payment intent generation');
    await settingsService.set('merchant_name', merchantName.trim(), 'Merchant Payee Display Name shown during UPI checkout');
    showToast('Merchant UPI configuration saved to database! Customer checkout updated.', 'success');
  };

  const handleSaveSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportPhone.trim()) {
      showToast('Primary mobile number cannot be empty.', 'error');
      return;
    }
    if (!supportWhatsapp.trim()) {
      showToast('WhatsApp number cannot be empty.', 'error');
      return;
    }
    await settingsService.set('support_phone', supportPhone.trim(), 'Primary customer support phone number');
    await settingsService.set('support_whatsapp', supportWhatsapp.trim(), 'Customer care WhatsApp contact number');
    await settingsService.set('support_alt_phone', supportAltPhone.trim(), 'Alternative customer support phone number');
    showToast('Support contact details updated successfully in database!', 'success');
  };

  const handleSaveCloudinary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudName.trim()) {
      showToast('Cloudinary Cloud Name cannot be empty.', 'error');
      return;
    }
    await settingsService.set('cloudinary_cloud_name', cloudName.trim(), 'Cloudinary cloud name for product media assets');
    await settingsService.set('cloudinary_folder', uploadFolder.trim() || '3d-printing/products', 'Cloudinary root upload folder');
    localStorage.setItem('printlab_cloudinary_api_key', cloudinaryApiKey.trim());
    localStorage.setItem('printlab_cloudinary_api_secret', cloudinaryApiSecret.trim());
    showToast('Cloudinary media settings saved successfully to database!', 'success');
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo products and orders to original seed state?')) {
      resetAllStorageToSeed();
      showToast('Reset data to default catalog!', 'success');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  // Derived Cloudinary URL preview
  const cloudinaryUrlPreview = `cloudinary://${cloudinaryApiKey}:${showSecret ? cloudinaryApiSecret : '••••••••••••••••'}@${cloudName}`;

  const sqlSchemaSnippet = `-- ==========================================
-- PRINTLAB 3D - COMPLETE DATABASE SCHEMA
-- Compatible with Supabase PostgreSQL & Storage
-- ==========================================

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  material TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  print_time TEXT DEFAULT '1h',
  available_colors JSONB DEFAULT '[]',
  image_url TEXT NOT NULL,
  gallery_urls JSONB DEFAULT '[]',
  model_type TEXT DEFAULT 'mesh_stand',
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  college TEXT,
  college_type TEXT DEFAULT 'KPR College',
  roll_number TEXT,
  delivery_method TEXT DEFAULT 'college_delivery',
  department TEXT,
  year TEXT,
  section TEXT,
  building_block TEXT,
  pickup_location TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  pincode TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ORDERS TABLE (With 10-Minute Payment Session Timestamps)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  customization JSONB DEFAULT '{}',
  order_status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  payment_session_created_at TIMESTAMPTZ DEFAULT now(),
  payment_session_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  upi_id TEXT,
  transaction_id TEXT,
  screenshot_url TEXT,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  detected_upi_id TEXT,
  detected_transaction_id TEXT,
  detected_amount NUMERIC,
  detected_payment_status TEXT,
  ocr_confidence NUMERIC,
  upi_match BOOLEAN,
  amount_match BOOLEAN,
  transaction_match BOOLEAN,
  is_duplicate_transaction BOOLEAN DEFAULT false,
  duplicate_order_number TEXT,
  receiver_name TEXT,
  sender_name TEXT,
  payment_date TEXT,
  payment_time TEXT,
  warnings JSONB DEFAULT '[]',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow public read of available products
CREATE POLICY "Public products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Public settings are viewable by everyone" ON settings FOR SELECT USING (true);
`;

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">System Settings & Integrations</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure merchant payment details, customer support contacts, Cloudinary media storage, and database parameters.
          </p>
        </div>

        {/* Section 1: Customer Support Contact Settings (PART 3) */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Customer Support Contact Settings</h2>
              <p className="text-xs text-neutral-400">
                Configured phone and WhatsApp numbers are displayed in the customer care section, footer, and WhatsApp support button.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSupport} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Primary Mobile Number *</span>
                </label>
                <input
                  type="text"
                  required
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-neutral-500 block">Primary phone for direct customer calls</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp Number *</span>
                </label>
                <input
                  type="text"
                  required
                  value={supportWhatsapp}
                  onChange={(e) => setSupportWhatsapp(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="text-[11px] text-neutral-500 block">Opens WhatsApp chat link for customers</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Alternative Number (Optional)</span>
                </label>
                <input
                  type="text"
                  value={supportAltPhone}
                  onChange={(e) => setSupportAltPhone(e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-neutral-500 block">Optional fallback number (hidden if empty)</span>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Support Settings</span>
            </button>
          </form>
        </div>

        {/* Section 2: Merchant UPI Configuration */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Merchant UPI Receiving Details</h2>
              <p className="text-xs text-neutral-400">
                Configured values are dynamically encoded into customer QR codes, payment links, and copy actions.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveUPI} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300">UPI ID / VPA Handle *</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. printlab3d@okhdfcbank"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-neutral-500 block">Accepts Google Pay, PhonePe, Paytm, BHIM VPAs</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300">UPI Payee Display Name *</label>
                <input
                  type="text"
                  required
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="PRINTLAB 3D"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-neutral-500 block">Name displayed to customers on payment confirmation</span>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save UPI Settings</span>
            </button>
          </form>
        </div>

        {/* Section 3: Cloudinary Media Configuration */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-white">Cloudinary Media Configuration</h2>
                <p className="text-xs text-neutral-400">
                  Configure Cloudinary parameters (Cloud Name, API Key, API Secret, URL, Folder) for 3D product showcase image delivery.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 border bg-sky-950/80 text-sky-300 border-sky-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Cloud: {cloudName}</span>
            </span>
          </div>

          <form onSubmit={handleSaveCloudinary} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300">Cloud Name *</label>
                <input
                  type="text"
                  required
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  placeholder="e.g. jushiok7"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-neutral-500 block">Cloudinary account identifier</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300">API Key *</label>
                <input
                  type="text"
                  required
                  value={cloudinaryApiKey}
                  onChange={(e) => setCloudinaryApiKey(e.target.value)}
                  placeholder="e.g. 873981713524356"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-neutral-500 block">Cloudinary API Key</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300 flex items-center justify-between">
                  <span>API Secret *</span>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? 'Hide' : 'Show'}</span>
                  </button>
                </label>
                <input
                  type={showSecret ? 'text' : 'password'}
                  required
                  value={cloudinaryApiSecret}
                  onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                  placeholder="Enter Cloudinary API Secret"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-neutral-500 block">Stored securely for media uploads</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-300">Default Upload Folder</label>
                <input
                  type="text"
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  placeholder="3d-printing/products"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-neutral-500 block">Root asset folder for uploaded showcase images</span>
              </div>
            </div>

            {/* Cloudinary URL Preview */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1 font-mono">
              <span className="text-[11px] text-neutral-500 block uppercase">Generated CLOUDINARY_URL Format</span>
              <div className="text-sky-400 text-xs break-all select-all flex items-center justify-between gap-2">
                <span>{cloudinaryUrlPreview}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`cloudinary://${cloudinaryApiKey}:${cloudinaryApiSecret}@${cloudName}`);
                    showToast('Full Cloudinary URL copied to clipboard!', 'success');
                  }}
                  className="text-neutral-400 hover:text-white shrink-0 p-1 rounded hover:bg-neutral-800 cursor-pointer"
                  title="Copy full CLOUDINARY_URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-sky-500/20 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Cloudinary Settings</span>
            </button>
          </form>
        </div>

        {/* Section 4: Supabase Backend Status & Schema */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-white">Supabase Database Integration</h2>
                <p className="text-xs text-neutral-400">
                  Database parameters and complete schema definition
                </p>
              </div>
            </div>

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
                  <span>Dual Persistence Active</span>
                </>
              )}
            </span>
          </div>

          {/* Safe Public Configuration Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 font-mono">
              <span className="text-[11px] text-neutral-500 block uppercase">Project URL (Public)</span>
              <span className="text-white text-xs truncate block select-all">{supabaseUrl}</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 font-mono">
              <span className="text-[11px] text-neutral-500 block uppercase">Public Anon Key (Safe Client Key)</span>
              <span className="text-neutral-300 text-xs truncate block">{maskedAnonKey}</span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-neutral-300">
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-400 space-y-1">
              <div className="text-white font-semibold flex items-center justify-between">
                <span>Database Migration Schema (`supabase/schema.sql`)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sqlSchemaSnippet);
                    showToast('Complete SQL schema copied to clipboard!', 'success');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-xs cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copy SQL
                </button>
              </div>
              <p className="text-neutral-500">
                Includes all tables: `products`, `orders` (with 10-minute session timestamps), `payments`, `customers`, `admins`, `settings`, and RLS policies.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Data Maintenance */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Catalog & Mock Data Reset</h2>
              <p className="text-xs text-neutral-400">
                Restore the default 3D product catalog and sample order state for demonstration.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-neutral-400 max-w-md">
              Clears local modifications and reloads the default 3D product models.
            </p>

            <button
              onClick={handleResetData}
              className="px-5 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
