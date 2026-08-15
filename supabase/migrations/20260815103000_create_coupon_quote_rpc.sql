-- CR-008 Phase C.1: Read-only coupon quote RPC.
begin;

create or replace function public.quote_checkout_with_coupon(
  p_items jsonb,
  p_governorate text,
  p_coupon_code text
)
returns table (
  subtotal numeric(12,2),
  shipping_fee numeric(12,2),
  discount_amount numeric(12,2),
  total numeric(12,2),
  coupon_code text,
  coupon_discount_type text,
  coupon_applies_to text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_product_title text;
  v_unit_price numeric;
  v_stock_quantity integer;
  v_quantity integer;
  v_subtotal numeric := 0;
  v_shipping_fee numeric;
  v_discount_amount numeric := 0;
  v_target_amount numeric := 0;
  v_base_total numeric;
  v_total numeric;
  v_coupon_code text;
  v_coupon_discount_type text;
  v_coupon_applies_to text;
  v_discount_value numeric;
  v_usage_limit integer;
  v_usage_count integer;
  v_minimum_order_amount numeric;
  v_seen_product_ids text[] := array[]::text[];
begin
  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception 'INVALID_PRODUCT';
  end if;

  case p_governorate
    when 'القاهرة', 'الجيزة' then
      v_shipping_fee := 60;
    when 'الإسكندرية', 'الدقهلية', 'الشرقية', 'المنوفية',
         'الغربية', 'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد',
         'الإسماعيلية', 'السويس', 'مطروح' then
      v_shipping_fee := 70;
    when 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج',
         'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد',
         'شمال سيناء', 'جنوب سيناء' then
      v_shipping_fee := 80;
    else
      raise exception 'INVALID_GOVERNORATE';
  end case;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      raise exception 'INVALID_PRODUCT';
    end if;

    if jsonb_typeof(v_item->'quantity') <> 'number'
       or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]{0,3}$'
    then
      raise exception 'INVALID_QUANTITY';
    end if;

    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    if v_product_id::text = any(v_seen_product_ids) then
      raise exception 'DUPLICATE_PRODUCT';
    end if;
    v_seen_product_ids := array_append(v_seen_product_ids, v_product_id::text);

    select title, coalesce(sale_price, price), stock_quantity
      into v_product_title, v_unit_price, v_stock_quantity
      from public.products
     where id = v_product_id;

    if not found or v_unit_price is null or v_unit_price < 0 then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    if v_stock_quantity < v_quantity then
      raise exception 'INSUFFICIENT_STOCK';
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  v_coupon_code := nullif(upper(btrim(coalesce(p_coupon_code, ''))), '');

  if v_coupon_code is not null then
    select code, discount_type, applies_to, discount_value,
           usage_limit, usage_count, minimum_order_amount
      into v_coupon_code, v_coupon_discount_type, v_coupon_applies_to,
           v_discount_value, v_usage_limit, v_usage_count,
           v_minimum_order_amount
      from public.coupons
     where code = v_coupon_code
       and is_active
       and deleted_at is null
       and (starts_at is null or starts_at <= now())
       and (ends_at is null or ends_at > now());

    if not found
       or (v_usage_limit is not null and v_usage_count >= v_usage_limit)
       or v_subtotal < v_minimum_order_amount
    then
      raise exception 'COUPON_INVALID';
    end if;

    v_target_amount := case v_coupon_applies_to
      when 'products' then v_subtotal
      when 'shipping' then v_shipping_fee
      when 'order_total' then v_subtotal + v_shipping_fee
    end;

    if v_target_amount <= 0 then
      raise exception 'COUPON_INVALID';
    end if;

    v_discount_amount := case v_coupon_discount_type
      when 'percentage' then
        least(round(v_target_amount * v_discount_value / 100, 2), v_target_amount)
      when 'fixed_amount' then
        least(v_discount_value, v_target_amount)
      else 0
    end;
  else
    v_coupon_discount_type := null;
    v_coupon_applies_to := null;
    v_discount_value := null;
  end if;

  v_base_total := v_subtotal + v_shipping_fee;
  v_total := greatest(round(v_base_total - v_discount_amount, 2), 0);

  return query
  select
    round(v_subtotal, 2)::numeric(12,2),
    round(v_shipping_fee, 2)::numeric(12,2),
    round(v_discount_amount, 2)::numeric(12,2),
    v_total::numeric(12,2),
    v_coupon_code,
    v_coupon_discount_type,
    v_coupon_applies_to;
end;
$$;

revoke all on function public.quote_checkout_with_coupon(jsonb, text, text) from public;
grant execute on function public.quote_checkout_with_coupon(jsonb, text, text) to anon, authenticated;

commit;
