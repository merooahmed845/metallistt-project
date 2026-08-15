-- CR-008 Phase C.1: Coupon redemption audit trail.
begin;

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references public.coupons(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id text,
  code_snapshot text not null,
  discount_amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint coupon_redemptions_code_snapshot_check check (
    btrim(code_snapshot) <> ''
  ),
  constraint coupon_redemptions_discount_amount_check check (
    discount_amount >= 0
  ),
  constraint coupon_redemptions_order_unique unique (order_id)
);

create index coupon_redemptions_coupon_idx
  on public.coupon_redemptions (coupon_id, created_at desc);

create index coupon_redemptions_user_idx
  on public.coupon_redemptions (user_id, created_at desc);

alter table public.coupon_redemptions enable row level security;

revoke all on table public.coupon_redemptions from public;
grant select on table public.coupon_redemptions to authenticated;

create policy "Admins can read coupon redemptions"
on public.coupon_redemptions
for select
to authenticated
using (public.is_admin());

commit;
