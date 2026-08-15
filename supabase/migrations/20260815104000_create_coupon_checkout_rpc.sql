-- CR-008 Phase C.1: Final coupon-aware checkout RPC.
-- The legacy public.create_checkout_order signature is intentionally untouched.
begin;

create or replace function public.create_checkout_order_with_coupon(
  p_order_id uuid,
  p_items jsonb,
  p_full_name text,
  p_phone text,
  p_governorate text,
  p_address text,
  p_notes text,
  p_transfer_ref text,
  p_coupon_code text
)
returns table (
  order_id uuid,
  subtotal numeric(12,2),
  shipping_fee numeric(12,2),
  discount_amount numeric(12,2),
  total numeric(12,2)
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
  v_sorted_product_ids uuid[];
  v_seen_product_ids text[] := array[]::text[];
  v_order_items jsonb := '[]'::jsonb;
  v_user_id text := coalesce(auth.uid()::text, 'guest');
  v_subtotal numeric := 0;
  v_shipping_fee numeric;
  v_discount_amount numeric := 0;
  v_target_amount numeric := 0;
  v_base_total numeric;
  v_final_total numeric;
  v_coupon_code text;
  v_coupon_id uuid;
  v_coupon_discount_type text;
  v_coupon_applies_to text;
  v_discount_value numeric;
  v_usage_limit integer;
  v_usage_count integer;
  v_minimum_order_amount numeric;
  v_product_id_for_update uuid;
  v_item_quantity integer;
begin
  if p_order_id is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception 'INVALID_PRODUCT';
  end if;

  if coalesce(nullif(btrim(p_full_name), ''), null) is null
     or coalesce(nullif(btrim(p_phone), ''), null) is null
     or coalesce(nullif(btrim(p_address), ''), null) is null
     or coalesce(nullif(btrim(p_transfer_ref), ''), null) is null
  then
    raise exception 'INVALID_ORDER_DETAILS';
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
  end loop;

  select array_agg((value->>'product_id')::uuid order by (value->>'product_id')::uuid)
    into v_sorted_product_ids
    from jsonb_array_elements(p_items);

  for v_product_id_for_update in
    select product_id
      from unnest(v_sorted_product_ids) as sorted(product_id)
     order by product_id
  loop
    select title, coalesce(sale_price, price), stock_quantity
      into v_product_title, v_unit_price, v_stock_quantity
      from public.products
     where id = v_product_id_for_update
     for update;

    if not found or v_unit_price is null or v_unit_price < 0 then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    select (item.value->>'quantity')::integer
      into v_item_quantity
      from jsonb_array_elements(p_items) as item(value)
     where item.value->>'product_id' = v_product_id_for_update::text;

    if v_item_quantity is null or v_stock_quantity < v_item_quantity then
      raise exception 'INSUFFICIENT_STOCK';
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_item_quantity);
    v_order_items := v_order_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product_id_for_update,
        'title', v_product_title,
        'price', v_unit_price,
        'quantity', v_item_quantity
      )
    );
  end loop;

  v_coupon_code := nullif(upper(btrim(coalesce(p_coupon_code, ''))), '');

  if v_coupon_code is not null then
    select id, code, discount_type, applies_to, discount_value,
           usage_limit, usage_count, minimum_order_amount
      into v_coupon_id, v_coupon_code, v_coupon_discount_type,
           v_coupon_applies_to, v_discount_value, v_usage_limit,
           v_usage_count, v_minimum_order_amount
      from public.coupons
     where code = v_coupon_code
     for update;

    if not found
       or not exists (
         select 1
           from public.coupons coupon_check
          where coupon_check.id = v_coupon_id
            and coupon_check.is_active
            and coupon_check.deleted_at is null
            and (coupon_check.starts_at is null or coupon_check.starts_at <= now())
            and (coupon_check.ends_at is null or coupon_check.ends_at > now())
       )
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
    v_coupon_id := null;
    v_coupon_discount_type := null;
    v_coupon_applies_to := null;
    v_discount_value := null;
  end if;

  v_base_total := v_subtotal + v_shipping_fee;
  v_final_total := greatest(round(v_base_total - v_discount_amount, 2), 0);

  for v_product_id_for_update in
    select product_id
      from unnest(v_sorted_product_ids) as sorted(product_id)
     order by product_id
  loop
    select (item.value->>'quantity')::integer
      into v_item_quantity
      from jsonb_array_elements(p_items) as item(value)
     where item.value->>'product_id' = v_product_id_for_update::text;

    update public.products
       set stock_quantity = stock_quantity - v_item_quantity
     where id = v_product_id_for_update
       and stock_quantity >= v_item_quantity;

    if not found then
      raise exception 'INSUFFICIENT_STOCK';
    end if;
  end loop;

  perform set_config('app.secure_checkout', 'true', true);

  insert into public.orders (
    id,
    user_id,
    customer_name,
    full_name,
    phone,
    governorate,
    address,
    notes,
    transfer_ref,
    subtotal_price,
    coupon_id,
    coupon_code,
    coupon_discount_type,
    coupon_applies_to,
    coupon_discount_value,
    coupon_discount_amount,
    total_price,
    shipping_fee,
    items,
    status
  )
  values (
    p_order_id,
    v_user_id,
    btrim(p_full_name),
    btrim(p_full_name),
    btrim(p_phone),
    p_governorate,
    p_governorate || ' - ' || btrim(p_address),
    nullif(btrim(p_notes), ''),
    btrim(p_transfer_ref),
    round(v_subtotal, 2),
    v_coupon_id,
    v_coupon_code,
    v_coupon_discount_type,
    v_coupon_applies_to,
    case when v_coupon_id is null then null else round(v_discount_value, 2) end,
    round(v_discount_amount, 2),
    v_final_total,
    round(v_shipping_fee, 2),
    v_order_items,
    'pending'
  );

  insert into public.order_items (
    order_id,
    product_id,
    title,
    price,
    quantity
  )
  select
    p_order_id,
    item.value->>'product_id',
    item.value->>'title',
    (item.value->>'price')::numeric,
    (item.value->>'quantity')::integer
  from jsonb_array_elements(v_order_items) as item(value);

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (
      coupon_id,
      order_id,
      user_id,
      code_snapshot,
      discount_amount
    )
    values (
      v_coupon_id,
      p_order_id,
      v_user_id,
      v_coupon_code,
      round(v_discount_amount, 2)
    );

    update public.coupons
       set usage_count = usage_count + 1
     where id = v_coupon_id
       and (usage_limit is null or usage_count < usage_limit);

    if not found then
      raise exception 'COUPON_INVALID';
    end if;
  end if;

  return query
  select
    p_order_id,
    round(v_subtotal, 2)::numeric(12,2),
    round(v_shipping_fee, 2)::numeric(12,2),
    round(v_discount_amount, 2)::numeric(12,2),
    v_final_total::numeric(12,2);
end;
$$;

revoke all on function public.create_checkout_order_with_coupon(uuid, jsonb, text, text, text, text, text, text, text) from public;
grant execute on function public.create_checkout_order_with_coupon(uuid, jsonb, text, text, text, text, text, text, text) to anon, authenticated;

commit;
