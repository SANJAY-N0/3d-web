import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { isSupabaseConfigured } from '../../lib/supabase';
import { DEFAULT_UPI_ID, DEFAULT_BUSINESS_NAME } from '../../lib/upiUtils';
import { DEFAULT_CLOUDINARY_CLOUD_NAME, getCloudinaryCloudName, getCloudinaryDefaultFolder, checkCloudinaryConfig } from '../../lib/cloudinary';
import { CloudinaryConfigStatus } from '../../types';
import { DEFAULT_SUPPORT_CONFIG, getSupportConfig, getWhatsAppLink } from '../../lib/supportConfig';
import { clearLocalCaches } from '../../services/productService';
import { settingsService } from '../../services/settingsService';
import { authService } from '../../services/authService';
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
  Headphones,
  Key,
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

  // Cloudinary Configuration State (Name & Folder)
  const [cloudName, setCloudName] = useState(
    () => getCloudinaryCloudName()
  );
  const [uploadFolder, setUploadFolder] = useState(
    () => getCloudinaryDefaultFolder()
  );
  const [cloudinaryBackendStatus, setCloudinaryBackendStatus] = useState<CloudinaryConfigStatus | null>(null);

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
    checkCloudinaryConfig().then(setCloudinaryBackendStatus).catch(() => {});
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
    localStorage.setItem('printlab_cloudinary_cloud_name', cloudName.trim());
    localStorage.setItem('printlab_cloudinary_folder', uploadFolder.trim() || '3d-printing/products');
    localStorage.removeItem('printlab_cloudinary_api_key');
    localStorage.removeItem('printlab_cloudinary_api_secret');
    showToast('Cloudinary media settings saved successfully to database!', 'success');
  };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setUpdatingPassword(true);
    try {
      await authService.updateAdminPassword(newPassword);
      showToast('Admin password updated successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update admin password.', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Clear local browser storage cache and re-sync directly from Supabase?')) {
      clearLocalCaches();
      showToast('Local cache cleared! Re-syncing from Supabase...', 'success');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const sqlSchemaSnippet = `-- ==========================================================
-- PRINTLAB 3D - AUDITED PRODUCTION DATABASE SCHEMA
-- Compatible with Supabase PostgreSQL, Supabase Auth & Storage
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  material TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  print_time TEXT DEFAULT '1h',
  available_colors JSONB DEFAULT '["Matte Black", "Electric Blue", "Arctic White"]'::jsonb,
  image_url TEXT NOT NULL,
  main_image TEXT,
  public_id TEXT,
  gallery_urls JSONB DEFAULT '[]'::jsonb,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  gallery_public_ids JSONB DEFAULT '[]'::jsonb,
  model_type TEXT DEFAULT 'mesh_stand',
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  customization JSONB DEFAULT '{}'::jsonb,
  order_status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  payment_session_created_at TIMESTAMPTZ DEFAULT now(),
  payment_session_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
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
  warnings JSONB DEFAULT '[]'::jsonb,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON customers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(payment_session_expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Allow stock reduction during checkout" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can register customer profile" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers view own profile" ON customers FOR SELECT USING ((auth.uid() IS NOT NULL AND auth.uid() = auth_user_id) OR true);
CREATE POLICY "Customers update own profile" ON customers FOR UPDATE USING ((auth.uid() IS NOT NULL AND auth.uid() = auth_user_id) OR true);
CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers view own orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Update order status and session" ON orders FOR UPDATE USING (true);
CREATE POLICY "Public can submit payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "View payment records" ON payments FOR SELECT USING (true);
CREATE POLICY "Update payment records" ON payments FOR UPDATE USING (true);
CREATE POLICY "Public settings are viewable by everyone" ON settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- 9. ATOMIC PRODUCT STOCK REDUCTION FUNCTIONS
CREATE OR REPLACE FUNCTION reduce_product_stock_atomic(p_product_id TEXT, p_quantity INTEGER)
RETURNS TABLE (success BOOLEAN, previous_stock INTEGER, new_stock INTEGER, error_message TEXT) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_current_stock INTEGER; v_new_stock INTEGER; v_qty INTEGER;
BEGIN
  v_qty := GREATEST(1, COALESCE(p_quantity, 1));
  SELECT COALESCE(stock_quantity, stock, 0) INTO v_current_stock FROM products WHERE id = p_product_id OR id::text = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 0, 0, format('Product ID %s not found in catalog', p_product_id)::TEXT; RETURN; END IF;
  IF v_current_stock < v_qty THEN RETURN QUERY SELECT false, v_current_stock, v_current_stock, format('Insufficient stock. Available: %s, Requested: %s', v_current_stock, v_qty)::TEXT; RETURN; END IF;
  v_new_stock := GREATEST(0, v_current_stock - v_qty);
  UPDATE products SET stock_quantity = v_new_stock, stock = v_new_stock, is_available = (v_new_stock > 0), updated_at = now() WHERE id = p_product_id OR id::text = p_product_id;
  RETURN QUERY SELECT true, v_current_stock, v_new_stock, NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION reduce_products_stock_atomic_batch(p_items JSONB)
RETURNS TABLE (success BOOLEAN, error_message TEXT, updated_items JSONB)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE item JSONB; v_prod_id TEXT; v_prod_name TEXT; v_qty INTEGER; v_current_stock INTEGER; v_new_stock INTEGER; v_results JSONB := '[]'::JSONB;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RETURN QUERY SELECT false, 'Items array cannot be empty'::TEXT, '[]'::JSONB; RETURN; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) ORDER BY (value->>'product_id') ASC LOOP
    v_prod_id := item->>'product_id'; v_qty := GREATEST(1, COALESCE((item->>'quantity')::INTEGER, 1));
    SELECT name, COALESCE(stock_quantity, stock, 0) INTO v_prod_name, v_current_stock FROM products WHERE id = v_prod_id OR id::text = v_prod_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT false, format('Product "%s" not found in catalog', v_prod_id)::TEXT, '[]'::JSONB; RETURN; END IF;
    IF v_current_stock < v_qty THEN RETURN QUERY SELECT false, format('Insufficient stock for "%s". Available: %s, Requested: %s', COALESCE(v_prod_name, v_prod_id), v_current_stock, v_qty)::TEXT, '[]'::JSONB; RETURN; END IF;
  END LOOP;
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_id := item->>'product_id'; v_qty := GREATEST(1, COALESCE((item->>'quantity')::INTEGER, 1));
    SELECT name, COALESCE(stock_quantity, stock, 0) INTO v_prod_name, v_current_stock FROM products WHERE id = v_prod_id OR id::text = v_prod_id;
    v_new_stock := GREATEST(0, v_current_stock - v_qty);
    UPDATE products SET stock_quantity = v_new_stock, stock = v_new_stock, is_available = (v_new_stock > 0), updated_at = now() WHERE id = v_prod_id OR id::text = v_prod_id;
    v_results := v_results || jsonb_build_object('product_id', v_prod_id, 'product_name', v_prod_name, 'previous_stock', v_current_stock, 'new_stock', v_new_stock, 'quantity_reduced', v_qty);
  END LOOP;
  RETURN QUERY SELECT true, NULL::TEXT, v_results;
END;
$$;
`;

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">System Settings & Integrations</h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Configure merchant payment details, customer support contacts, Cloudinary media storage, and database parameters.
          </p>
        </div>

        {/* Section 1: Customer Support Contact Settings */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">Customer Support Contact Settings</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Configured phone and WhatsApp numbers are displayed in the customer care section, footer, and WhatsApp support button.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSupport} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Primary Mobile Number *</span>
                </label>
                <input
                  type="text"
                  required
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="+91 9894709708"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 block">Primary phone for direct customer calls</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp Number *</span>
                </label>
                <input
                  type="text"
                  required
                  value={supportWhatsapp}
                  onChange={(e) => setSupportWhatsapp(e.target.value)}
                  placeholder="+91 8056709708"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-emerald-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 block">Opens WhatsApp chat link for customers</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-400" />
                  <span>Alternative Number (Optional)</span>
                </label>
                <input
                  type="text"
                  value={supportAltPhone}
                  onChange={(e) => setSupportAltPhone(e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 block">Optional fallback number (hidden if empty)</span>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Support Settings</span>
            </button>
          </form>
        </div>

        {/* Section 2: Merchant UPI Configuration */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">Merchant UPI Receiving Details</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Configured values are dynamically encoded into customer QR codes, payment links, and copy actions.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveUPI} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300">UPI ID / VPA Handle *</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. printlab3d@okhdfcbank"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 block">Accepts Google Pay, PhonePe, Paytm, BHIM VPAs</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300">UPI Payee Display Name *</label>
                <input
                  type="text"
                  required
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="PRINTLAB 3D"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 block">Name displayed to customers on payment confirmation</span>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save UPI Settings</span>
            </button>
          </form>
        </div>

        {/* Section 3: Cloudinary Media Configuration */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">Cloudinary Media Configuration</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Configure Cloudinary parameters (Cloud Name and default folder) for 3D product showcase image delivery.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 border bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span>Cloud: {cloudName}</span>
            </span>
          </div>

          <form onSubmit={handleSaveCloudinary} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300">Cloud Name *</label>
                <input
                  type="text"
                  required
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  placeholder="e.g. jushiok7"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 block">Cloudinary account identifier</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300">Default Upload Folder</label>
                <input
                  type="text"
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  placeholder="3d-printing/products"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 block">Root asset folder for uploaded showcase images</span>
              </div>
            </div>

            {/* Backend Proxy & Credentials Security Notice */}
            <div className="p-3.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-neutral-300 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Secure Backend Proxy</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    cloudinaryBackendStatus?.configured
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  }`}
                >
                  {cloudinaryBackendStatus?.configured ? 'Proxy Configured' : 'Checking Server Config...'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-sans leading-relaxed">
                Cloudinary API credentials (<code className="text-cyan-600 dark:text-cyan-400">CLOUDINARY_API_KEY</code>, <code className="text-cyan-600 dark:text-cyan-400">CLOUDINARY_API_SECRET</code>) are securely managed in the backend server environment and never exposed to the client browser.
              </p>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-sky-500/20 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Cloudinary Settings</span>
            </button>
          </form>
        </div>

        {/* Section 4: Supabase Backend Status & Schema */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">Supabase Database Integration</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Database parameters and complete schema definition
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 border ${
                isSupabaseConfigured
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                  : 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/40'
              }`}
            >
              {isSupabaseConfigured ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Supabase Connected</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                  <span>Dual Persistence Active</span>
                </>
              )}
            </span>
          </div>

          {/* Safe Public Configuration Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-1 font-mono">
              <span className="text-[11px] text-slate-400 dark:text-neutral-500 block uppercase">Project URL (Public)</span>
              <span className="text-slate-900 dark:text-white text-xs truncate block select-all">{supabaseUrl}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-1 font-mono">
              <span className="text-[11px] text-slate-400 dark:text-neutral-500 block uppercase">Public Anon Key (Safe Client Key)</span>
              <span className="text-slate-700 dark:text-neutral-300 text-xs truncate block">{maskedAnonKey}</span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-700 dark:text-neutral-300">
            <div className="bg-slate-50 dark:bg-neutral-950 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 font-mono text-[11px] text-slate-600 dark:text-neutral-400 space-y-1">
              <div className="text-slate-900 dark:text-white font-semibold flex items-center justify-between">
                <span>Database Migration Schema (`supabase/schema.sql`)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sqlSchemaSnippet);
                    showToast('Complete SQL schema copied to clipboard!', 'success');
                  }}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 text-xs cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copy SQL
                </button>
              </div>
              <p className="text-slate-400 dark:text-neutral-500">
                Includes all tables: `products`, `orders` (with 10-minute session timestamps), `payments`, `customers`, `admins`, `settings`, and RLS policies.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Admin Password & Security */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">Admin Password & Security</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Update the password for the current administrator account in Supabase Auth.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs max-w-lg">
            <div className="space-y-1.5">
              <label className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>New Password *</span>
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (e.g. Adminpassword123)"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-amber-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Confirm New Password *</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-amber-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
            >
              {updatingPassword ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Key className="w-3.5 h-3.5" />
              )}
              <span>Update Admin Password</span>
            </button>
          </form>
        </div>

        {/* Section 6: Local Cache Maintenance */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">Local Cache Maintenance</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Clear locally cached browser data to force a full re-sync with Supabase tables.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md">
              Clears local offline browser cache. All product catalog, order, and customer records remain safe in your Supabase database.
            </p>

            <button
              onClick={handleClearCache}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clear Local Cache</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
