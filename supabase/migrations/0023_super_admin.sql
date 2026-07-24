-- 0023_super_admin.sql
-- Adds a `super_admin` role that sits ABOVE owner in the hierarchy:
--   super_admin > owner > admin > editor
-- super_admin is "locked": it can only be created by this seed. It cannot be
-- created, changed, or deleted through the dashboard UI/API, and no one
-- (including owner) can manage a super_admin row. It inherits every admin/editor
-- privilege because it is added to is_admin()/is_editor(), so all existing RLS
-- policies accept it without changes.

-- ── 1. Extend the role CHECK constraint ─────────────────────────────────────
-- The inline check in 0003_profiles.sql is auto-named `profiles_role_check`.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('super_admin','owner','admin','editor'));

-- ── 2. Role helper functions ────────────────────────────────────────────────
-- super_admin inherits admin + editor power so it clears every existing policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_user_role() in ('super_admin','owner','admin'), false);
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_user_role() in ('super_admin','owner','admin','editor'), false);
$$;

-- Exclusive predicate for super-admin-only rules (available for future use).
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_user_role() = 'super_admin', false);
$$;

-- ── 3. Seed the super_admin account (idempotent) ────────────────────────────
-- Creates the GoTrue auth user + password identity, then a super_admin profile.
-- Password is bcrypt-hashed via pgcrypto (crypt/gen_salt from 0001_extensions).
-- Guarded by NOT EXISTS so re-running does nothing.
do $$
declare
  v_user_id uuid;
  v_email   text := 'support@ekalliptus.com';
begin
  if not exists (select 1 from auth.users where email = v_email) then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      crypt('Support2026', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Super Admin"}'::jsonb,
      now(), now()
    );

    -- Password identity so email/password sign-in works.
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_user_id, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  else
    select id into v_user_id from auth.users where email = v_email;
  end if;

  -- The on_auth_user_created trigger inserts a default profile; force the role.
  insert into public.profiles (id, full_name, role)
  values (v_user_id, 'Super Admin', 'super_admin')
  on conflict (id) do update set role = 'super_admin', full_name = 'Super Admin';
end $$;
