-- =========================================================================
-- POS BILLING TRANSACTIONS, STOCK & SALES CHANNEL AVAILABILITY MIGRATION
-- Compatible with Supabase PostgreSQL, Supabase Auth & Realtime
-- =========================================================================

-- 1. ADD STOCK_QUANTITY, ONLINE_AVAILABLE, ON_SPOT_AVAILABLE TO PRODUCTS
DO $$ 
BEGIN
  -- stock_quantity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 50;
  END IF;

  -- stock (backward compatibility alias)
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

-- Sync any existing stock values to stock_quantity
UPDATE products 
SET stock_quantity = COALESCE(stock, stock_quantity, 50)
WHERE stock_quantity IS NULL;

UPDATE products
SET stock = stock_quantity
WHERE stock IS NULL;


-- 2. CREATE BILLING_TRANSACTIONS TABLE
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

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_billing_transactions_bill_number ON billing_transactions(bill_number);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_order_id ON billing_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created_at ON billing_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_on_spot_available ON products(on_spot_available);
CREATE INDEX IF NOT EXISTS idx_products_online_available ON products(online_available);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);

-- 4. ROW LEVEL SECURITY (RLS)
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

-- 5. REALTIME PUBLICATION FOR PRODUCTS & BILLING_TRANSACTIONS
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'realtime publication notice: %', SQLERRM;
END $$;

-- 6. ATOMIC STOCK REDUCTION FUNCTION (PREVENTS CONCURRENCY RACE CONDITIONS)
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
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
BEGIN
  -- Row-level lock to prevent concurrent race conditions
  SELECT COALESCE(stock_quantity, stock, 0) INTO v_current_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'Product not found'::TEXT;
    RETURN;
  END IF;

  IF v_current_stock < p_quantity THEN
    RETURN QUERY SELECT false, v_current_stock, v_current_stock, 
      format('Insufficient stock. Available: %s, Requested: %s', v_current_stock, p_quantity)::TEXT;
    RETURN;
  END IF;

  v_new_stock := v_current_stock - p_quantity;

  UPDATE products
  SET 
    stock_quantity = v_new_stock,
    stock = v_new_stock,
    is_available = (v_new_stock > 0),
    updated_at = now()
  WHERE id = p_product_id;

  RETURN QUERY SELECT true, v_current_stock, v_new_stock, NULL::TEXT;
END;
$$;
