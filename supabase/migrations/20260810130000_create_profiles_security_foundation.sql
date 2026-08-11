-- Security foundation: database-backed application roles.
--
-- Expectations:
-- - This migration runs in a Supabase project where auth.users already exists.
-- - Existing users are not automatically assigned a profile or elevated role.
-- - A later migration must enable Row Level Security and define policies before
--   browser access to this table is relied upon.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer',
  constraint profiles_role_check check (role in ('customer', 'admin'))
);

create index if not exists profiles_role_idx on public.profiles (role);

comment on table public.profiles is
  'Application profile and authorization role for a Supabase Auth user.';

comment on column public.profiles.role is
  'Application role. Allowed values: customer or admin.';
