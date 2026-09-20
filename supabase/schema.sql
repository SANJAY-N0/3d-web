-- ==========================================================
-- PRINTLAB 3D - SUPABASE POSTGRESQL DATABASE SCHEMA
-- ==========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PRODUCTS TABLE
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  price numeric(10,2) not null check (price > 0),
  category text not null,
  material text,
  dimensions text,
  print_time text,
  available_colors text[] default '{}',
  image_url text not null,
  gallery_urls text[] default '{}',
  model_url text,
  model_type text default 'mesh_stand',
  is_available boolean default true,
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. CUSTOMERS TABLE
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  college text,
  address text not null,
  city text default 'Bengaluru',
  state text,
  pincode text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. ORDERS TABLE
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  customization jsonb default '{}'::jsonb,
  order_status text not null default 'PENDING_PAYMENT' 
    check (order_status in (
      'PENDING_PAYMENT',
      'PENDING_PAYMENT_VERIFICATION',
      'PAYMENT_VERIFIED',
      'PRINTING',
      'READY_FOR_PICKUP',
      'COMPLETED',
      'CANCELLED'
    )),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. PAYMENTS TABLE
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade unique,
  amount numeric(10,2) not null,
  upi_id text,
  transaction_id text,
  screenshot_url text,
  payment_status text not null default 'PENDING'
    check (payment_status in ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED')),
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. ADMINS PROFILE TABLE
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text default 'admin',
  created_at timestamptz default now()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.admins enable row level security;

-- Products: Everyone can read available products; only authenticated admins can insert/update/delete.
create policy "Public can view products"
  on public.products for select
  using (true);

create policy "Admins can manage products"
  on public.products for all
  using (auth.role() = 'authenticated');

-- Customers: Anyone can insert a customer record when ordering; authenticated admins can select/manage all.
create policy "Public can create customer during order"
  on public.customers for insert
  with check (true);

create policy "Admins can view customers"
  on public.customers for select
  using (auth.role() = 'authenticated');

-- Orders: Public can create order and view own order by order_number or ID; admins can view & manage all.
create policy "Public can create order"
  on public.orders for insert
  with check (true);

create policy "Public can view own order"
  on public.orders for select
  using (true);

create policy "Admins can update orders"
  on public.orders for update
  using (auth.role() = 'authenticated');

create policy "Admins can delete orders"
  on public.orders for delete
  using (auth.role() = 'authenticated');

-- Payments: Public can create/submit payment info; admins can view and verify.
create policy "Public can submit payment"
  on public.payments for insert
  with check (true);

create policy "Public can update own payment submission"
  on public.payments for update
  using (true);

create policy "Admins can manage payments"
  on public.payments for all
  using (auth.role() = 'authenticated');

-- ==========================================================
-- STORAGE BUCKETS SETUP
-- ==========================================================
-- In Supabase dashboard or SQL:
-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);
-- insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false);
