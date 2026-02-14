-- Template migration
-- Copy this file, rename it with a UTC timestamp + short description, then edit.
-- Example: 20260213103000_add_glytch_audit_log.sql

begin;

-- 1) Schema changes
-- create table if not exists public.example_table (
--   id bigint generated always as identity primary key,
--   created_at timestamptz not null default now()
-- );

-- 2) Data backfill (if needed)
-- update public.example_table
-- set created_at = now()
-- where created_at is null;

-- 3) Functions / grants / policies
-- create or replace function public.example_fn()
-- returns void
-- language sql
-- security definer
-- set search_path = public
-- as $$
--   select 1;
-- $$;

-- revoke all on function public.example_fn() from public;
-- grant execute on function public.example_fn() to authenticated;

commit;
