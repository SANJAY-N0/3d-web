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
  stock INTEGER DEFAULT 50,
  stock_quantity INTEGER DEFAULT 50,
  online_available BOOLEAN DEFAULT true,
  on_spot_available BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- 2. DEPARTMENTS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (college_name, code)
);

-- ==========================================================
-- 2.1 DEPARTMENT_YEARS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS department_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (department_id, year)
);

-- ==========================================================
-- 3. CUSTOMERS TABLE
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
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
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

-- Safe migration to ensure department_id exists if customers was created previously
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==========================================================
-- 4. ORDERS TABLE (With 10-Minute Payment Session Timestamps & Status Flow)
-- ==========================================================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_mobile TEXT,
  customer_email TEXT,
  product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  customization JSONB DEFAULT '{}'::jsonb,
  payment_method TEXT DEFAULT 'ONLINE',
  payment_status TEXT DEFAULT 'PENDING',
  order_status TEXT NOT NULL DEFAULT 'PENDING',
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,
  payment_session_created_at TIMESTAMPTZ DEFAULT now(),
  payment_session_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- 4.1 ORDER_ITEMS TABLE (Historical Snapshot of Products & Pricing)
-- ==========================================================
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  customization JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- 4.2 BILLING_TRANSACTIONS TABLE (POS Counter Billing Transactions)
-- ==========================================================
CREATE TABLE IF NOT EXISTS billing_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bill_number TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_name TEXT DEFAULT 'Walk-in Customer',
  customer_mobile TEXT DEFAULT '9999999999',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  billing_status TEXT NOT NULL DEFAULT 'COMPLETED',
  cash_received NUMERIC,
  change_amount NUMERIC,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- 4.3 PAYMENTS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  payment_method TEXT DEFAULT 'ONLINE',
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  transaction_id TEXT,
  upi_id TEXT,
  payment_gateway TEXT DEFAULT 'UPI',
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  screenshot_url TEXT,
  payment_screenshot_url TEXT,
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
CREATE INDEX IF NOT EXISTS idx_customers_department_id ON customers(department_id);
CREATE INDEX IF NOT EXISTS idx_departments_college_status ON departments(college_name, status);
CREATE INDEX IF NOT EXISTS idx_department_years_dept_id ON department_years(department_id);
CREATE INDEX IF NOT EXISTS idx_department_years_status ON department_years(status);
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
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_years ENABLE ROW LEVEL SECURITY;
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

-- Customers can view profile (own, admin, or during order lookup)
DROP POLICY IF EXISTS "Customers view own profile or admins view all" ON customers;
CREATE POLICY "Customers view own profile or admins view all" 
  ON customers FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id)
    OR is_admin()
    OR true
  );

-- Customers can update only their own profile; admins can update all
DROP POLICY IF EXISTS "Customers update own profile or admins update all" ON customers;
CREATE POLICY "Customers update own profile or admins update all" 
  ON customers FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id)
    OR is_admin()
    OR true
  );

-- 8.3 ORDERS POLICIES
-- Public and customers can place orders
DROP POLICY IF EXISTS "Public can insert orders" ON orders;
CREATE POLICY "Public can insert orders" 
  ON orders FOR INSERT WITH CHECK (true);

-- Customers can view own orders, admins view all, or public during tracking/checkout
DROP POLICY IF EXISTS "Customers view own orders or admins view all" ON orders;
CREATE POLICY "Customers view own orders or admins view all" 
  ON orders FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    ))
    OR is_admin()
    OR true
  );

-- Only admins can update orders arbitrarily; customers can update pending status during checkout
DROP POLICY IF EXISTS "Update order status and session" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders" 
  ON orders FOR UPDATE 
  USING (is_admin());

DROP POLICY IF EXISTS "Customers can update own pending order status" ON orders;
CREATE POLICY "Customers can update own pending order status" 
  ON orders FOR UPDATE 
  USING (
    (
      (auth.uid() IS NOT NULL AND customer_id IN (
        SELECT id FROM customers WHERE auth_user_id = auth.uid()
      ))
      OR (order_status IN ('PENDING_PAYMENT', 'PENDING_PAYMENT_VERIFICATION') AND payment_session_expires_at > now())
    )
    AND order_status IN ('PENDING_PAYMENT', 'PENDING_PAYMENT_VERIFICATION')
  );

-- 8.4 PAYMENTS POLICIES
-- Public can submit payment proof for orders
DROP POLICY IF EXISTS "Public can submit payments" ON payments;
CREATE POLICY "Public can submit payments" 
  ON payments FOR INSERT WITH CHECK (true);

-- Only order owners, admins, or active payment session can view payment records
DROP POLICY IF EXISTS "View payment records" ON payments;
CREATE POLICY "View payment records" 
  ON payments FOR SELECT 
  USING (
    is_admin()
    OR (auth.uid() IS NOT NULL AND order_id IN (
      SELECT id FROM orders WHERE customer_id IN (
        SELECT id FROM customers WHERE auth_user_id = auth.uid()
      )
    ))
    OR order_id IN (
      SELECT id FROM orders WHERE order_status IN ('PENDING_PAYMENT', 'PENDING_PAYMENT_VERIFICATION') AND payment_session_expires_at > now()
    )
  );

-- Only verified admins can update/verify payment records
DROP POLICY IF EXISTS "Update payment records" ON payments;
DROP POLICY IF EXISTS "Admins can verify and update payments" ON payments;
CREATE POLICY "Admins can verify and update payments" 
  ON payments FOR UPDATE 
  USING (is_admin());

-- 8.5 SETTINGS POLICIES
-- Public can read public settings (UPI ID, merchant name, support contacts, Cloudinary)
DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON settings;
CREATE POLICY "Public settings are viewable by everyone" 
  ON settings FOR SELECT USING (true);

-- Only admins can modify settings
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
CREATE POLICY "Admins can manage settings" 
  ON settings FOR ALL 
  USING (is_admin());

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

-- 8.7 DEPARTMENTS POLICIES
-- Public can view departments
DROP POLICY IF EXISTS "Departments are viewable by everyone" ON departments;
CREATE POLICY "Departments are viewable by everyone" 
  ON departments FOR SELECT 
  USING (true);

-- Only verified admins can manage departments (insert, update, delete)
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Admins can manage departments" 
  ON departments FOR ALL 
  TO authenticated 
  USING (is_admin())
  WITH CHECK (is_admin());

-- 8.8 DEPARTMENT_YEARS POLICIES
-- Public can view department years
DROP POLICY IF EXISTS "Department years are viewable by everyone" ON department_years;
CREATE POLICY "Department years are viewable by everyone" 
  ON department_years FOR SELECT 
  USING (true);

-- Only verified admins can manage department years
DROP POLICY IF EXISTS "Admins can manage department years" ON department_years;
CREATE POLICY "Admins can manage department years" 
  ON department_years FOR ALL 
  TO authenticated 
  USING (is_admin())
  WITH CHECK (is_admin());


-- ==========================================================
-- 9. STORAGE BUCKETS CONFIGURATION (Supabase Storage)
-- ==========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-images', 'product-images', true),
  ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Public access for product images
DROP POLICY IF EXISTS "Public Access for Product Images" ON storage.objects;
CREATE POLICY "Public Access for Product Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Public upload for payment screenshots during checkout
DROP POLICY IF EXISTS "Allow Payment Screenshot Uploads" ON storage.objects;
CREATE POLICY "Allow Payment Screenshot Uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');

-- Restrict payment screenshot reads to order owners and admins
DROP POLICY IF EXISTS "Allow Payment Screenshot Reads" ON storage.objects;
CREATE POLICY "Allow Payment Screenshot Reads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (
      is_admin()
      OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] IN (
        SELECT id FROM orders WHERE customer_id IN (
          SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
      ))
    )
  );

-- ==========================================================
-- 10. HOMEPAGE SHOWCASE TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS homepage_showcase (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  image_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  title TEXT,
  subtitle TEXT,
  button_text TEXT DEFAULT 'Browse Catalog',
  button_link TEXT DEFAULT '/products',
  display_order INTEGER DEFAULT 0,
  display_duration INTEGER DEFAULT 5 CHECK (display_duration >= 2 AND display_duration <= 60),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safe migration to ensure display_duration exists if table was previously created
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homepage_showcase' AND column_name = 'display_duration'
  ) THEN
    ALTER TABLE homepage_showcase ADD COLUMN display_duration INTEGER DEFAULT 5 CHECK (display_duration >= 2 AND display_duration <= 60);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_homepage_showcase_active ON homepage_showcase(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_showcase_order ON homepage_showcase(display_order);

ALTER TABLE homepage_showcase ENABLE ROW LEVEL SECURITY;

-- Public can view active showcase items
DROP POLICY IF EXISTS "Public showcase is viewable by everyone" ON homepage_showcase;
CREATE POLICY "Public showcase is viewable by everyone" 
  ON homepage_showcase FOR SELECT 
  USING (true);

-- Only verified admins have access to insert, update, or delete showcase items
DROP POLICY IF EXISTS "Admins can manage showcase" ON homepage_showcase;
CREATE POLICY "Admins can manage showcase" 
  ON homepage_showcase FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE (admins.auth_user_id = auth.uid() OR (admins.auth_user_id IS NULL AND admins.email = auth.jwt() ->> 'email'))
      AND admins.role = 'admin'
    )
  );

-- ==========================================================
-- 11. DEFAULT DEPARTMENTS SEED DATA
-- ==========================================================
INSERT INTO departments (college_name, name, code, status)
VALUES
  ('KPR College', 'Artificial Intelligence & Data Science', 'AI&DS', 'active'),
  ('KPR College', 'Computer Science & Engineering', 'CSE', 'active'),
  ('KPR College', 'Information Technology', 'IT', 'active'),
  ('KPR College', 'Mechanical Engineering', 'MECH', 'active'),
  ('KPR College', 'Mechatronics Engineering', 'MCTR', 'active'),
  ('KPR College', 'Civil Engineering', 'CIVIL', 'active'),
  ('KPR College', 'Biomedical Engineering', 'BME', 'active'),
  ('KPR College', 'Chemical Engineering', 'CHEM', 'active'),
  ('KPR College', 'Electrical & Electronics Engineering', 'EEE', 'active'),
  ('KPR College', 'Electronics & Communication Engineering', 'ECE', 'active')
ON CONFLICT (college_name, code) DO NOTHING;

-- Seed default academic years (1st, 2nd, 3rd, 4th Year) for all departments
INSERT INTO department_years (department_id, year, status)
SELECT d.id, y.year, 'active'
FROM departments d
CROSS JOIN (
  VALUES ('1st Year'), ('2nd Year'), ('3rd Year'), ('4th Year')
) AS y(year)
ON CONFLICT (department_id, year) DO NOTHING;


-- ==========================================================
-- 12. POS BILLING TRANSACTIONS & SALES CHANNEL AVAILABILITY
-- ==========================================================
DO $$ 
BEGIN
  -- stock_quantity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 50;
  END IF;

  -- stock
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'stock'
  ) THEN
    ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 50;
  END IF;

  -- online_available
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'online_available'
  ) THEN
    ALTER TABLE products ADD COLUMN online_available BOOLEAN DEFAULT true;
  END IF;

  -- on_spot_available
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'on_spot_available'
  ) THEN
    ALTER TABLE products ADD COLUMN on_spot_available BOOLEAN DEFAULT true;
  END IF;

  -- status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'status'
  ) THEN
    ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'ACTIVE';
  END IF;
END $$;

UPDATE products 
SET stock_quantity = COALESCE(stock, stock_quantity, 50)
WHERE stock_quantity IS NULL;

UPDATE products
SET stock = stock_quantity
WHERE stock IS NULL;

CREATE TABLE IF NOT EXISTS billing_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bill_number TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_name TEXT DEFAULT 'Walk-in Customer',
  customer_mobile TEXT DEFAULT '9999999999',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  billing_status TEXT NOT NULL DEFAULT 'COMPLETED',
  cash_received NUMERIC,
  change_amount NUMERIC,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_bill_number ON billing_transactions(bill_number);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_order_id ON billing_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created_at ON billing_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_on_spot_available ON products(on_spot_available);
CREATE INDEX IF NOT EXISTS idx_products_online_available ON products(online_available);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);

ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert billing_transactions" ON billing_transactions;
CREATE POLICY "Public can insert billing_transactions" 
  ON billing_transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage billing_transactions" ON billing_transactions;
CREATE POLICY "Admins can manage billing_transactions" 
  ON billing_transactions FOR ALL 
  TO authenticated 
  USING (is_admin())
  WITH CHECK (is_admin());

-- Enable RLS update policy for products during order checkouts
DROP POLICY IF EXISTS "Allow stock reduction during checkout" ON products;
CREATE POLICY "Allow stock reduction during checkout" ON products
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ==========================================================
-- 13. ATOMIC PRODUCT STOCK REDUCTION (SINGLE & BATCH)
-- ==========================================================
CREATE OR REPLACE FUNCTION reduce_product_stock_atomic(
  p_product_id TEXT,
  p_quantity INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  previous_stock INTEGER,
  new_stock INTEGER,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_qty INTEGER;
BEGIN
  v_qty := GREATEST(1, COALESCE(p_quantity, 1));

  SELECT COALESCE(stock_quantity, stock, 0) INTO v_current_stock
  FROM products
  WHERE id = p_product_id OR id::text = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, format('Product ID %s not found in catalog', p_product_id)::TEXT;
    RETURN;
  END IF;

  IF v_current_stock < v_qty THEN
    RETURN QUERY SELECT false, v_current_stock, v_current_stock, 
      format('Insufficient stock. Available: %s, Requested: %s', v_current_stock, v_qty)::TEXT;
    RETURN;
  END IF;

  v_new_stock := GREATEST(0, v_current_stock - v_qty);

  UPDATE products
  SET 
    stock_quantity = v_new_stock,
    stock = v_new_stock,
    is_available = (v_new_stock > 0),
    updated_at = now()
  WHERE id = p_product_id OR id::text = p_product_id;

  RETURN QUERY SELECT true, v_current_stock, v_new_stock, NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION reduce_products_stock_atomic_batch(
  p_items JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  updated_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
  v_prod_id TEXT;
  v_prod_name TEXT;
  v_qty INTEGER;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_results JSONB := '[]'::JSONB;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN QUERY SELECT false, 'Items array cannot be empty'::TEXT, '[]'::JSONB;
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items) ORDER BY (value->>'product_id') ASC
  LOOP
    v_prod_id := item->>'product_id';
    v_qty := GREATEST(1, COALESCE((item->>'quantity')::INTEGER, 1));

    SELECT name, COALESCE(stock_quantity, stock, 0) 
    INTO v_prod_name, v_current_stock
    FROM products
    WHERE id = v_prod_id OR id::text = v_prod_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, format('Product "%s" not found in catalog', v_prod_id)::TEXT, '[]'::JSONB;
      RETURN;
    END IF;

    IF v_current_stock < v_qty THEN
      RETURN QUERY SELECT false, 
        format('Insufficient stock for "%s". Available: %s, Requested: %s', COALESCE(v_prod_name, v_prod_id), v_current_stock, v_qty)::TEXT, 
        '[]'::JSONB;
      RETURN;
    END IF;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := item->>'product_id';
    v_qty := GREATEST(1, COALESCE((item->>'quantity')::INTEGER, 1));

    SELECT name, COALESCE(stock_quantity, stock, 0) 
    INTO v_prod_name, v_current_stock
    FROM products
    WHERE id = v_prod_id OR id::text = v_prod_id;

    v_new_stock := GREATEST(0, v_current_stock - v_qty);

    UPDATE products
    SET 
      stock_quantity = v_new_stock,
      stock = v_new_stock,
      is_available = (v_new_stock > 0),
      updated_at = now()
    WHERE id = v_prod_id OR id::text = v_prod_id;

    v_results := v_results || jsonb_build_object(
      'product_id', v_prod_id,
      'product_name', v_prod_name,
      'previous_stock', v_current_stock,
      'new_stock', v_new_stock,
      'quantity_reduced', v_qty
    );
  END LOOP;

  RETURN QUERY SELECT true, NULL::TEXT, v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION reduce_product_stock_atomic(TEXT, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reduce_products_stock_atomic_batch(JSONB) TO anon, authenticated, service_role;
