-- ============================================================
-- Metallia — MISSING core tables migration (written 2026-11-25)
-- These tables were originally created by hand in the Supabase
-- dashboard, so no migration existed for them. Column lists for
-- products/categories are verified against the live Table Editor
-- (2026-11-25). orders/order_items/reviews are rebuilt from the
-- checkout RPC migrations + the columns the code reads/writes.
-- Dated 20260810000000 so it runs before the profiles migration
-- (20260810130000) and every migration that references
-- public.orders. Profile-dependent admin policies live in
-- 20260810140000_core_admin_policies.sql (after profiles).
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ---------- categories (live-verified: 5 columns) ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  created_at timestamptz not null default now()
);

-- ---------- products (live-verified: 11 columns) ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  price numeric(12,2) not null,
  sale_price numeric(12,2),
  stock_quantity integer not null default 0,
  images text[] not null default '{}',  -- VERIFY type in live DB (text[] vs jsonb)
  category_id uuid references public.categories(id) on delete set null,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_created_idx on public.products(created_at desc);

-- ---------- orders (from checkout RPC inserts + page fields) ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id text,  -- auth uid as text, or 'guest' (set by checkout RPC)
  customer_name text,
  full_name text,
  phone text,
  governorate text,
  address text,
  notes text,
  transfer_ref text,
  total_price numeric(12,2),
  shipping_fee numeric(12,2),
  items jsonb,  -- snapshot of items written by the checkout RPC
  status text not null default 'قيد المعالجة',
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- ---------- order_items ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title text,
  price numeric(12,2),
  quantity integer not null default 1
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------- reviews (from product page + my-orders inserts) ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews(product_id, created_at desc);

-- ---------- RLS: match how the app actually accesses data ----------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

-- Public catalogue: anyone can read products and categories
create policy "Public can read categories" on public.categories for select using (true);
create policy "Public can read products" on public.products for select using (true);
create policy "Public can read reviews" on public.reviews for select using (true);

-- Reviews: a signed-in user can add a review as themselves
create policy "Users insert own reviews" on public.reviews for insert
  with check (user_id = auth.uid());

-- Orders: customers read only their own (inserts only via the secure checkout RPC)
create policy "Users read own orders" on public.orders for select
  using (user_id = auth.uid()::text);
create policy "Users read own order items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()::text));

commit;
