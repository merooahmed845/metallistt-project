-- Secure checkout creation. Financial values are derived from public.products
-- inside one database transaction; existing RLS policies are intentionally unchanged.

create or replace function public.require_secure_checkout_context()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.secure_checkout', true) is distinct from 'true' then
    raise exception 'SECURE_CHECKOUT_REQUIRED';
  end if;

  return new;
end;
$$;

drop trigger if exists require_secure_checkout_order on public.orders;
create trigger require_secure_checkout_order
before insert on public.orders
for each row execute function public.require_secure_checkout_context();

drop trigger if exists require_secure_checkout_order_item on public.order_items;
create trigger require_secure_checkout_order_item
before insert on public.order_items
for each row execute function public.require_secure_checkout_context();

create or replace function public.create_checkout_order(
  p_order_id uuid,
  p_items jsonb,
  p_full_name text,
  p_phone text,
  p_governorate text,
  p_address text,
  p_notes text,
  p_transfer_ref text
)
returns table (order_id uuid, total numeric, shipping_fee numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_product_title text;
  v_unit_price numeric;
  v_quantity integer;
  v_subtotal numeric := 0;
  v_shipping_fee numeric;
  v_order_items jsonb := '[]'::jsonb;
  v_user_id text := coalesce(auth.uid()::text, 'guest');
begin
  if p_order_id is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_PRODUCT';
  end if;

  if coalesce(nullif(btrim(p_full_name), ''), null) is null
    or coalesce(nullif(btrim(p_phone), ''), null) is null
    or coalesce(nullif(btrim(p_address), ''), null) is null
    or coalesce(nullif(btrim(p_transfer_ref), ''), null) is null then
    raise exception 'INVALID_ORDER_DETAILS';
  end if;

  case p_governorate
    when 'القاهرة', 'الجيزة' then v_shipping_fee := 60;
    when 'الإسكندرية', 'الدقهلية', 'الشرقية', 'المنوفية', 'الغربية', 'البحيرة',
         'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'مطروح' then v_shipping_fee := 70;
    when 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر',
         'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'شمال سيناء', 'جنوب سيناء' then v_shipping_fee := 80;
    else raise exception 'INVALID_GOVERNORATE';
  end case;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'INVALID_PRODUCT';
    end if;

    if jsonb_typeof(v_item->'quantity') <> 'number'
      or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]{0,3}$' then
      raise exception 'INVALID_QUANTITY';
    end if;

    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    select title, coalesce(sale_price, price)
      into v_product_title, v_unit_price
      from public.products
      where id = v_product_id;

    if not found or v_unit_price is null or v_unit_price < 0 then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id,
      'title', v_product_title,
      'price', v_unit_price,
      'quantity', v_quantity
    ));
  end loop;

  perform set_config('app.secure_checkout', 'true', true);

  insert into public.orders (
    id, user_id, customer_name, full_name, phone, governorate, address, notes,
    transfer_ref, total_price, shipping_fee, items, status
  ) values (
    p_order_id, v_user_id, btrim(p_full_name), btrim(p_full_name), btrim(p_phone),
    p_governorate, p_governorate || ' - ' || btrim(p_address), nullif(btrim(p_notes), ''),
    btrim(p_transfer_ref), v_subtotal + v_shipping_fee, v_shipping_fee, v_order_items, 'قيد المعالجة'
  );

  insert into public.order_items (order_id, product_id, title, price, quantity)
  select
    p_order_id,
    (item.value->>'product_id')::uuid,
    item.value->>'title',
    (item.value->>'price')::numeric,
    (item.value->>'quantity')::integer
  from jsonb_array_elements(v_order_items) as item(value);

  return query select p_order_id, v_subtotal + v_shipping_fee, v_shipping_fee;
end;
$$;

revoke all on function public.create_checkout_order(uuid, jsonb, text, text, text, text, text, text) from public;
grant execute on function public.create_checkout_order(uuid, jsonb, text, text, text, text, text, text) to anon, authenticated;
