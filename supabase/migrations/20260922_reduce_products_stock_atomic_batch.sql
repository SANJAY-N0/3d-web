-- =========================================================================
-- BATCH & SINGLE ATOMIC PRODUCT STOCK REDUCTION FUNCTIONS
-- Concurrency-safe, deadlock-free, prevents negative stock, updates availability
-- Uses SECURITY DEFINER to bypass RLS restrictions during automated checkouts
-- =========================================================================

-- Enable RLS update policy for products during order checkouts
DROP POLICY IF EXISTS "Allow stock reduction during checkout" ON products;
CREATE POLICY "Allow stock reduction during checkout" ON products
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 1. SINGLE PRODUCT ATOMIC STOCK REDUCTION
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

  -- Row-level lock to prevent concurrent race conditions
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

-- 2. BATCH ATOMIC PRODUCT STOCK REDUCTION
-- Accepts JSONB array: [{"product_id": "...", "quantity": 2}, ...]
-- Locks all products in deterministic order to prevent deadlocks.
-- Validates all stocks before making any modifications.
-- If any product has insufficient stock, aborts with no changes.
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

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION reduce_product_stock_atomic(TEXT, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reduce_products_stock_atomic_batch(JSONB) TO anon, authenticated, service_role;
