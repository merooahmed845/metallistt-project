-- CR-008 Phase C.1: Immutable coupon and subtotal snapshot on orders.
begin;

alter table public.orders
  add column subtotal_price numeric(12,2),
  add column coupon_id uuid references public.coupons(id) on delete set null,
  add column coupon_code text,
  add column coupon_discount_type text,
  add column coupon_applies_to text,
  add column coupon_discount_value numeric(12,2),
  add column coupon_discount_amount numeric(12,2) not null default 0;

create index orders_coupon_id_idx
  on public.orders (coupon_id);

alter table public.orders
  add constraint orders_coupon_snapshot_check check (
    (
      coupon_code is null
      and coupon_id is null
      and coupon_discount_type is null
      and coupon_applies_to is null
      and coupon_discount_value is null
      and coupon_discount_amount = 0
    )
    or (
      coupon_code is not null
      and coupon_code = upper(btrim(coupon_code))
      and coupon_code ~ '^[A-Z0-9_-]{3,64}$'
      and coupon_discount_type in ('percentage', 'fixed_amount')
      and coupon_applies_to in ('products', 'shipping', 'order_total')
      and coupon_discount_value is not null
      and coupon_discount_value > 0
      and (
        coupon_discount_type <> 'percentage'
        or coupon_discount_value <= 100
      )
      and coupon_discount_amount >= 0
    )
  );

commit;
