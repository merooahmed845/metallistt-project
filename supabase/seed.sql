-- Metallia seed — the live store's actual starter data (2026-11-25)
-- 1 category + 3 products, names/prices as shown on metallia.vercel.app.
-- Image URLs: point these at the uploaded product-images files after
-- creating the storage buckets in the new project, or replace with
-- the new project's public storage URLs.
begin;
insert into public.categories (name, slug, image_url) values
  ('كوالين الأبواب', 'door-locks', null)
on conflict (slug) do nothing;

insert into public.products (title, slug, description, price, sale_price, stock_quantity, images, category_id, is_featured)
select 'كالون باب كمبيوتر 3 مدفع - طرمبة 5 مفتاح (ماركة KING)', 'king-3-bolt-computer-lock', 'كالون باب أمان ماركة KING مزود بـ 3 مدافع قوية لضمان الأمان التام، يأتي مع طرمبة 5 مفتاح.', 300, 249, 10, '{}', c.id, true from public.categories c where c.slug = 'door-locks'
union all
select 'كالون باب كمبيوتر 4 مدفع - طرمبة 7 مفتاح (ماركة Rimbo)', 'rimbo-4-bolt-computer-lock', 'كالون باب أمان عالي الجودة ماركة Rimbo، يتميز بـ 4 مدافع أمان صلبة لتوفير أقصى درجات الحماية.', 350, 299, 10, '{}', c.id, true from public.categories c where c.slug = 'door-locks'
union all
select 'كالون سلندر عادة لسان - طرمبة 3 مفتاح (ماركة Rimbo)', 'rimbo-cylinder-lock', 'كالون باب سلندر لسان عادة ماركة Rimbo، حل عملي واقتصادي يجمع بين الأمان والجودة.', 250, 199, 10, '{}', c.id, false from public.categories c where c.slug = 'door-locks';
commit;
