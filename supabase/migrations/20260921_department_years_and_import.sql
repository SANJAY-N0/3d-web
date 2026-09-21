-- ==========================================================
-- Migration: Add department_years table and seed default academic years
-- ==========================================================

-- 1. Create department_years table
CREATE TABLE IF NOT EXISTS department_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (department_id, year)
);

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_department_years_dept_id ON department_years(department_id);
CREATE INDEX IF NOT EXISTS idx_department_years_status ON department_years(status);

-- 3. Row Level Security
ALTER TABLE department_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Department years are viewable by everyone" ON department_years;
CREATE POLICY "Department years are viewable by everyone" 
  ON department_years FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admins can manage department years" ON department_years;
CREATE POLICY "Admins can manage department years" 
  ON department_years FOR ALL 
  TO authenticated 
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Seed default academic years (1st, 2nd, 3rd, 4th Year) for existing departments
INSERT INTO department_years (department_id, year, status)
SELECT d.id, y.year, 'active'
FROM departments d
CROSS JOIN (
  VALUES ('1st Year'), ('2nd Year'), ('3rd Year'), ('4th Year')
) AS y(year)
ON CONFLICT (department_id, year) DO NOTHING;
