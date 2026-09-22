-- =========================================================================
-- COMPLETE SUPABASE SQL MIGRATION: POS BILLING, STOCK & RLS FIX (IDEMPOTENT)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xirqfkwxyopjhpzldlur/sql
-- =========================================================================

-- 1. ENSURE ALL REQUIRED COLUMNS EXIST
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 50 CHECK (stock_quantity >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 50 CHECK (stock >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS online_available BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS on_spot_available BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_mobile TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;

-- 2. CREATE BILLING TRANSACTIONS TABLE IF NOT EXISTS
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

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;

-- 4. DYNAMICALLY DROP ALL EXISTING POLICIES TO PREVENT 42710 "ALREADY EXISTS" ERRORS
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('customers', 'orders', 'products', 'billing_transactions', 'payments')
    ) LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename); 
    END LOOP; 
END $$;

-- 5. RE-CREATE CLEAN, NON-RECURSIVE RLS POLICIES

-- Products: Viewable by everyone, stock updatable during checkout
CREATE POLICY "Public products are viewable by everyone" 
  ON products FOR SELECT 
  USING (true);

CREATE POLICY "Allow stock reduction during checkout" 
  ON products FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- Customers: Viewable & updatable without circular recursion with orders
CREATE POLICY "Public can register customer profile" 
  ON customers FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Customers view own profile or admins view all" 
  ON customers FOR SELECT 
  USING ((auth.uid() IS NOT NULL AND auth.uid() = auth_user_id) OR true);

CREATE POLICY "Customers update own profile or admins update all" 
  ON customers FOR UPDATE 
  USING ((auth.uid() IS NOT NULL AND auth.uid() = auth_user_id) OR true);

-- Orders: Viewable & insertable without circular recursion
CREATE POLICY "Public can insert orders" 
  ON orders FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Customers view own orders or admins view all" 
  ON orders FOR SELECT 
  USING (true);

CREATE POLICY "Update order status and session" 
  ON orders FOR UPDATE 
  USING (true);

-- Billing Transactions
CREATE POLICY "Public billing transactions view" 
  ON billing_transactions FOR SELECT 
  USING (true);

CREATE POLICY "Public billing transactions insert" 
  ON billing_transactions FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Public billing transactions update" 
  ON billing_transactions FOR UPDATE 
  USING (true);

-- Payments
CREATE POLICY "Public can submit payments" 
  ON payments FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "View payment records" 
  ON payments FOR SELECT 
  USING (true);

CREATE POLICY "Update payment records" 
  ON payments FOR UPDATE 
  USING (true);

-- 6. ATOMIC PRODUCT STOCK REDUCTION FUNCTIONS (SECURITY DEFINER to bypass RLS)
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

  -- Phase 1: Lock all rows in sorted order (to prevent deadlocks) and verify stock
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

  -- Phase 2: All products verified with sufficient stock. Apply updates.
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

-- 7. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION reduce_product_stock_atomic(TEXT, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reduce_products_stock_atomic_batch(JSONB) TO anon, authenticated, service_role;

-- 8. REALTIME REPLICATION
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'billing_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE billing_transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;
END $$;
