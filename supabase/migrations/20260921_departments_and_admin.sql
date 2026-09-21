-- =========================================================================
-- PRINTLAB 3D - DEPARTMENTS TABLE, CUSTOMER RELATION & ADMIN SEED MIGRATION
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xirqfkwxyopjhpzldlur/sql
-- =========================================================================

-- Enable pgcrypto for password hashing & UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT NOT NULL DEFAULT 'KPR College',
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_college_dept_code UNIQUE (college_name, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_college_status ON departments(college_name, status);

-- 2. ADD department_id TO CUSTOMERS TABLE
ALTER TABLE customers ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_department_id ON customers(department_id);

-- 3. ROW LEVEL SECURITY (RLS) FOR DEPARTMENTS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Helper is_admin function check (creates if not already present)
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

-- Public can view active departments; admins can view all
DROP POLICY IF EXISTS "Public can view active departments" ON departments;
CREATE POLICY "Public can view active departments"
  ON departments FOR SELECT
  USING (status = 'active' OR is_admin());

-- Only admins can insert, update, or delete departments
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. SEED DEFAULT KPR COLLEGE DEPARTMENTS
INSERT INTO departments (college_name, name, code, status)
VALUES
  ('KPR College', 'Computer Science and Engineering', 'CSE', 'active'),
  ('KPR College', 'Artificial Intelligence and Data Science', 'AI & DS', 'active'),
  ('KPR College', 'Information Technology', 'IT', 'active'),
  ('KPR College', 'Electronics and Communication Engineering', 'ECE', 'active'),
  ('KPR College', 'Electrical and Electronics Engineering', 'EEE', 'active'),
  ('KPR College', 'Mechanical Engineering', 'MECH', 'active'),
  ('KPR College', 'Civil Engineering', 'CIVIL', 'active'),
  ('KPR College', 'Biomedical Engineering', 'BME', 'active'),
  ('KPR College', 'Chemical Engineering', 'CHEM', 'active'),
  ('KPR College', 'Mechatronics Engineering', 'MCT', 'active')
ON CONFLICT (college_name, code) DO UPDATE 
  SET name = EXCLUDED.name, status = 'active';

-- 5. SEED / RESET ADMIN ACCOUNT (admin@printlab.io / Adminpassword123)
DO $$
DECLARE
  new_auth_id UUID;
BEGIN
  SELECT id INTO new_auth_id FROM auth.users WHERE email = 'admin@printlab.io';

  IF new_auth_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      encrypted_password = crypt('Adminpassword123', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"name":"Administrator"}'::jsonb,
      updated_at = now()
    WHERE id = new_auth_id;
  ELSE
    new_auth_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      new_auth_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@printlab.io',
      crypt('Adminpassword123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Administrator"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  END IF;

  INSERT INTO public.admins (auth_user_id, email, name, role)
  VALUES (new_auth_id, 'admin@printlab.io', 'Administrator', 'admin')
  ON CONFLICT (email) DO UPDATE 
    SET auth_user_id = new_auth_id, role = 'admin', name = 'Administrator';
END $$;
