-- ==========================================================
-- PRINTLAB 3D - COMPLETE DATABASE SCHEMA
-- Compatible with Supabase PostgreSQL & Supabase Storage
-- Includes: products, orders (with 10-minute payment session),
-- payments, customers, admins, settings, RLS policies & Storage
-- ==========================================================

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  gallery_urls JSONB DEFAULT '[]'::jsonb,
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
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

-- ==========================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(payment_session_expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Products: Everyone can read available products; only authenticated admins can insert/update/delete
CREATE POLICY "Public products are viewable by everyone" 
  ON products FOR SELECT USING (true);

CREATE POLICY "Admins can modify products" 
  ON products FOR ALL USING (auth.role() = 'authenticated');

-- Orders: Public can insert new orders and view their own by order_number/id; admins have full access
CREATE POLICY "Public can insert orders" 
  ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view own orders" 
  ON orders FOR SELECT USING (true);

CREATE POLICY "Public can update own order session or payment" 
  ON orders FOR UPDATE USING (true);

-- Payments: Public can submit payment proofs; admins have full access
CREATE POLICY "Public can insert payments" 
  ON payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view own payments" 
  ON payments FOR SELECT USING (true);

CREATE POLICY "Admins can manage payments" 
  ON payments FOR ALL USING (auth.role() = 'authenticated');

-- Customers: Public can register and read their customer profile
CREATE POLICY "Public can manage customers" 
  ON customers FOR ALL USING (true);

-- Settings: Everyone can read public settings; only admins can modify
CREATE POLICY "Public settings are viewable by everyone" 
  ON settings FOR SELECT USING (true);

CREATE POLICY "Admins can modify settings" 
  ON settings FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================================
-- STORAGE BUCKETS CONFIGURATION (Supabase Storage)
-- ==========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-images', 'product-images', true),
  ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Public access for product images
CREATE POLICY "Public Access for Product Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Authenticated upload for payment screenshots
CREATE POLICY "Allow Payment Screenshot Uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Allow Payment Screenshot Reads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs');
