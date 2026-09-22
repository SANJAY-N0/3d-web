-- =========================================================================
-- PRINTLAB 3D - LIVE ORDERS, ORDER ITEMS & PAYMENT MANAGEMENT MIGRATION
-- Compatible with Supabase PostgreSQL, Supabase Auth & Realtime
-- =========================================================================

-- Enable pgcrypto extension for UUID generation if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. EXTEND ORDERS TABLE WITH REQUIRED FIELDS
DO $$ 
BEGIN
  -- customer_name snapshot
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_name TEXT;
  END IF;

  -- customer_mobile snapshot
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_mobile'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_mobile TEXT;
  END IF;

  -- customer_email snapshot
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_email TEXT;
  END IF;

  -- subtotal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE orders ADD COLUMN subtotal NUMERIC DEFAULT 0;
  END IF;

  -- payment_method (CASH, ONLINE)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'ONLINE';
  END IF;

  -- payment_status (PENDING, PAID, FAILED, CASH_PENDING, CASH_RECEIVED)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'PENDING';
  END IF;

  -- confirmed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMPTZ;
  END IF;

  -- confirmed_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'confirmed_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN confirmed_by TEXT;
  END IF;
END $$;

-- 2. CREATE ORDER_ITEMS TABLE (SNAPSHOT OF PRODUCT NAME & PRICE)
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

-- 3. EXTEND PAYMENTS TABLE WITH GATEWAY & METHOD FIELDS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_method TEXT DEFAULT 'ONLINE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_gateway'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_gateway TEXT DEFAULT 'UPI';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'gateway_order_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN gateway_order_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'gateway_payment_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN gateway_payment_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_screenshot_url'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_screenshot_url TEXT;
  END IF;
END $$;

-- 4. HIGH-PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- 5. ROW LEVEL SECURITY (RLS) FOR ORDER_ITEMS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Anyone can insert order items when creating an order
DROP POLICY IF EXISTS "Public can insert order items" ON order_items;
CREATE POLICY "Public can insert order items" 
  ON order_items FOR INSERT WITH CHECK (true);

-- Order items are viewable by owner or admin
DROP POLICY IF EXISTS "Order items viewable by customer or admin" ON order_items;
CREATE POLICY "Order items viewable by customer or admin" 
  ON order_items FOR SELECT 
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (
        (auth.uid() IS NOT NULL AND orders.customer_id IN (
          SELECT id FROM customers WHERE auth_user_id = auth.uid()
        ))
        OR (orders.order_status IN ('PENDING', 'PENDING_PAYMENT', 'PENDING_PAYMENT_VERIFICATION') AND orders.payment_session_expires_at > now())
      )
    )
  );

-- Only admins can update or delete order items
DROP POLICY IF EXISTS "Admins can manage order items" ON order_items;
CREATE POLICY "Admins can manage order items" 
  ON order_items FOR ALL 
  TO authenticated 
  USING (is_admin())
  WITH CHECK (is_admin());

-- 6. ENABLE REALTIME PUBLICATION FOR ORDERS, ORDER_ITEMS, PAYMENTS
-- Enables automatic websocket broadcasts on INSERT / UPDATE / DELETE
DO $$
BEGIN
  -- Add orders to publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;

  -- Add order_items to publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  END IF;

  -- Add payments to publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If publication doesn't exist or table already exists in publication, continue safely
    RAISE NOTICE 'Realtime publication setup notice: %', SQLERRM;
END $$;
