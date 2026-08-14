-- CR-006 Phase B: restrict product image writes to database-level admins.
-- Public reads remain enabled for the public storefront.
begin;

drop policy if exists "Allow public uploads to product-images" on storage.objects;
drop policy if exists "Give public access to product-images" on storage.objects;

create policy "Admins can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_admin()
 );

create policy "Admins can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_admin()
 )
with check (
  bucket_id = 'product-images'
  and public.is_admin()
 );

create policy "Admins can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_admin()
 );

commit;
