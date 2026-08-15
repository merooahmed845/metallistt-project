-- CR-008 corrective migration: restore intended direct ACLs only.
begin;

revoke all privileges
on table public.coupons
from anon;

revoke all privileges
on table public.coupon_redemptions
from anon;

revoke all privileges
on table public.coupon_redemptions
from authenticated;

grant select
on table public.coupon_redemptions
to authenticated;

revoke truncate, references, trigger, maintain
on table public.coupons
from authenticated;

grant select, insert, update, delete
on table public.coupons
to authenticated;

commit;
