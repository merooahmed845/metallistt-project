-- CR-007: Dynamic homepage banners schema and authorization.
begin;

create table public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  alt_text text not null,
  image_path text not null,
  mobile_image_path text,
  body text,
  cta_label text,
  cta_href text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_banners_alt_text_check check (btrim(alt_text) <> ''),
  constraint homepage_banners_image_path_check check (btrim(image_path) <> ''),
  constraint homepage_banners_mobile_image_path_check check (
    mobile_image_path is null or btrim(mobile_image_path) <> ''
  ),
  constraint homepage_banners_display_order_check check (display_order >= 0),
  constraint homepage_banners_schedule_check check (
    ends_at is null or starts_at is null or ends_at > starts_at
  ),
  constraint homepage_banners_cta_pair_check check (
    (cta_label is null and cta_href is null)
    or (
      btrim(cta_label) <> ''
      and btrim(cta_href) <> ''
    )
  ),
  constraint homepage_banners_cta_path_check check (
    cta_href is null
    or (
      cta_href ~ '^/'
      and cta_href !~ '^//'
      and cta_href !~ '^[A-Za-z][A-Za-z0-9+.-]*:'
      and cta_href !~ '[[:cntrl:]]'
    )
  )
);

create index homepage_banners_public_order_idx
  on public.homepage_banners (is_active, display_order, id);

create or replace function public.set_homepage_banners_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_homepage_banners_updated_at on public.homepage_banners;
create trigger set_homepage_banners_updated_at
before update on public.homepage_banners
for each row execute function public.set_homepage_banners_updated_at();

alter table public.homepage_banners enable row level security;

grant select on public.homepage_banners to anon, authenticated;
grant insert, update, delete on public.homepage_banners to authenticated;

create policy "Public can read active homepage banners"
on public.homepage_banners
for select
to anon, authenticated
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

create policy "Admins can read all homepage banners"
on public.homepage_banners
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert homepage banners"
on public.homepage_banners
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update homepage banners"
on public.homepage_banners
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete homepage banners"
on public.homepage_banners
for delete
to authenticated
using (public.is_admin());

create or replace function public.reorder_homepage_banner(
  p_banner_id uuid,
  p_direction text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
  v_current_index integer;
  v_neighbor_index integer;
  v_temp_id uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if p_direction not in ('up', 'down') then
    raise exception 'INVALID_DIRECTION';
  end if;

  -- Serialize reorder operations and lock the current rows for this transaction.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('homepage_banners_reorder'));
  perform 1 from public.homepage_banners for update;

  select array_agg(id order by display_order asc, id asc)
    into v_ids
    from public.homepage_banners;

  if v_ids is null then
    raise exception 'BANNER_NOT_FOUND';
  end if;

  v_current_index := array_position(v_ids, p_banner_id);
  if v_current_index is null then
    raise exception 'BANNER_NOT_FOUND';
  end if;

  v_neighbor_index := case
    when p_direction = 'up' then v_current_index - 1
    else v_current_index + 1
  end;

  if v_neighbor_index < 1 or v_neighbor_index > array_length(v_ids, 1) then
    raise exception 'NO_NEIGHBOR';
  end if;

  v_temp_id := v_ids[v_current_index];
  v_ids[v_current_index] := v_ids[v_neighbor_index];
  v_ids[v_neighbor_index] := v_temp_id;

  update public.homepage_banners banner
  set display_order = ordered.position::integer - 1
  from unnest(v_ids) with ordinality as ordered(id, position)
  where banner.id = ordered.id;
end;
$$;

revoke all on function public.reorder_homepage_banner(uuid, text) from public;
grant execute on function public.reorder_homepage_banner(uuid, text) to authenticated;

commit;
