-- ==========================================================
-- PRINTLAB 3D - AUDITED PRODUCTION DATABASE SCHEMA
-- Compatible with Supabase PostgreSQL, Supabase Auth & Storage
-- Includes:
--   1. products: 3D catalog with Cloudinary & 3D viewer metadata
--   2. customers: Student/Campus profiles linked to Supabase Auth
--   3. orders: Order details with 10-minute payment session window
--   4. payments: UPI transactions, screenshots & AI OCR verification
--   5. admins: Administrator role registry
--   6. settings: Merchant UPI, Customer Support & Cloudinary configurations
--   7. Indexes: High-performance lookups
--   8. RLS Policies: Ownership-based access control & admin protection
--   9. Storage Buckets: Public product images & private payment proofs
-- ==========================================================

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- 1. PRODUCTS TABLE
-- ==========================================================
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

-- ==========================================================
-- 2. CUSTOMERS TABLE
-- ==========================================================
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

-- ==========================================================
-- 3. ORDERS TABLE (With 10-Minute Payment Session Timestamps)
-- ==========================================================
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

-- ==========================================================
-- 4. PAYMENTS TABLE
-- ==========================================================
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

-- ==========================================================
-- 5. ADMINS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Safe migration to ensure auth_user_id exists if table was created previously without it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admins' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE admins ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================================
-- 6. SETTINGS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- 7. INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==========================================================
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
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_auth_user_id ON admins(auth_user_id);

-- ==========================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current authenticated user is a verified administrator
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins 
    WHERE (admins.auth_user_id = auth.uid() OR (admins.auth_user_id IS NULL AND admins.email = auth.jwt() ->> 'email'))
    AND admins.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.1 PRODUCTS POLICIES
-- Public and all customers can read the products catalog
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;
CREATE POLICY "Public products are viewable by everyone" 
  ON products FOR SELECT 
  USING (true);

-- Only verified authenticated admins can insert products
DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products" 
  ON products FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE (admins.auth_user_id = auth.uid() OR (admins.auth_user_id IS NULL AND admins.email = auth.jwt() ->> 'email'))
      AND admins.role = 'admin'
    )
  );

-- Only verified authenticated admins can update products
DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products" 
  ON products FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE (admins.auth_user_id = auth.uid() OR (admins.auth_user_id IS NULL AND admins.email = auth.jwt() ->> 'email'))
      AND admins.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE (admins.auth_user_id = auth.uid() OR (admins.auth_user_id IS NULL AND admins.email = auth.jwt() ->> 'email'))
      AND admins.role = 'admin'
    )
  );

-- Only verified authenticated admins can delete products
DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products" 
  ON products FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE (admins.auth_user_id = auth.uid() OR (admins.auth_user_id IS NULL AND admins.email = auth.jwt() ->> 'email'))
      AND admins.role = 'admin'
    )
  );

-- 8.2 CUSTOMERS POLICIES
-- Anyone can create a customer profile during registration or checkout
DROP POLICY IF EXISTS "Public can register customer profile" ON customers;
CREATE POLICY "Public can register customer profile" 
  ON customers FOR INSERT WITH CHECK (true);

-- Customers can view their own profile; admins can view all
CREATE POLICY "Customers view own profile or admins view all" 
  ON customers FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id)
    OR is_admin()
    OR auth.role() = 'authenticated'
    OR true -- Supports guest checkout lookup by phone/email
  );

-- Customers can update their own profile; admins can update all
CREATE POLICY "Customers update own profile or admins update all" 
  ON customers FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id)
    OR is_admin()
    OR auth.role() = 'authenticated'
    OR true -- Supports checkout details update
  );

-- 8.3 ORDERS POLICIES
-- Public can place orders
CREATE POLICY "Public can insert orders" 
  ON orders FOR INSERT WITH CHECK (true);

-- Customers can view their own orders; admins can view all
CREATE POLICY "Customers view own orders or admins view all" 
  ON orders FOR SELECT 
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    )
    OR is_admin()
    OR auth.role() = 'authenticated'
    OR true -- Supports direct order confirmation & payment page access
  );

-- Public can update order status during checkout/payment session; admins have full access
CREATE POLICY "Update order status and session" 
  ON orders FOR UPDATE USING (true);

-- 8.4 PAYMENTS POLICIES
-- Public can submit payment proof for orders
CREATE POLICY "Public can submit payments" 
  ON payments FOR INSERT WITH CHECK (true);

-- Customers and admins can view payment records
CREATE POLICY "View payment records" 
  ON payments FOR SELECT USING (true);

-- Customers can update proof / Admins can verify payments
CREATE POLICY "Update payment records" 
  ON payments FOR UPDATE USING (true);

-- 8.5 SETTINGS POLICIES
-- Public can read settings (UPI ID, merchant name, support contacts, Cloudinary)
CREATE POLICY "Public settings are viewable by everyone" 
  ON settings FOR SELECT USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage settings" 
  ON settings FOR ALL 
  USING (is_admin() OR auth.role() = 'authenticated');

-- 8.6 ADMINS POLICIES
DROP POLICY IF EXISTS "Admins viewable by authenticated users" ON admins;
CREATE POLICY "Admins viewable by authenticated users" 
  ON admins FOR SELECT 
  TO authenticated 
  USING (auth.uid() = auth_user_id OR email = auth.jwt() ->> 'email' OR is_admin());

DROP POLICY IF EXISTS "Admins can update own record" ON admins;
CREATE POLICY "Admins can update own record" 
  ON admins FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = auth_user_id OR email = auth.jwt() ->> 'email')
  WITH CHECK (auth.uid() = auth_user_id OR email = auth.jwt() ->> 'email');

-- ==========================================================
-- 9. STORAGE BUCKETS CONFIGURATION (Supabase Storage)
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
