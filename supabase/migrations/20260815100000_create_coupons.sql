-- CR-008 Phase C.1: Coupons schema, constraints, admin-only RLS, and updated_at trigger.
begin;

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type text not null,
  applies_to text not null,
  discount_value numeric(12,2) not null,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  minimum_order_amount numeric(12,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_code_canonical_check check (
    code = upper(btrim(code))
    and code ~ '^[A-Z0-9_-]{3,64}$'
  ),
  constraint coupons_discount_type_check check (
    discount_type in ('percentage', 'fixed_amount')
  ),
  constraint coupons_applies_to_check check (
    applies_to in ('products', 'shipping', 'order_total')
  ),
  constraint coupons_discount_value_check check (
    discount_value > 0
    and (
      discount_type <> 'percentage'
      or discount_value <= 100
    )
  ),
  constraint coupons_usage_limit_check check (
    usage_limit is null or usage_limit > 0
  ),
  constraint coupons_usage_count_check check (
    usage_count >= 0
  ),
  constraint coupons_minimum_order_amount_check check (
    minimum_order_amount >= 0
  ),
  constraint coupons_schedule_check check (
    ends_at is null
    or starts_at is null
    or ends_at > starts_at
  ),
  constraint coupons_code_unique unique (code)
);

create index coupons_active_lookup_idx
  on public.coupons (code, is_active, starts_at, ends_at);

create or replace function public.set_coupons_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at
before update on public.coupons
for each row execute function public.set_coupons_updated_at();

alter table public.coupons enable row level security;

revoke all on table public.coupons from public;
grant select, insert, update, delete on table public.coupons to authenticated;

create policy "Admins can read coupons"
on public.coupons
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert coupons"
on public.coupons
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update coupons"
on public.coupons
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete coupons"
on public.coupons
for delete
to authenticated
using (public.is_admin());

commit;
