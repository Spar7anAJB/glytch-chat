-- 20260213124500_profile_presence_status.sql
begin;

alter table public.profiles
  add column if not exists presence_status text not null default 'active',
  add column if not exists presence_updated_at timestamptz not null default now();

update public.profiles
set presence_status = 'active'
where presence_status is null or btrim(presence_status) = '';

update public.profiles
set presence_updated_at = coalesce(presence_updated_at, created_at, now())
where presence_updated_at is null;

alter table public.profiles alter column presence_status set default 'active';
alter table public.profiles alter column presence_updated_at set default now();
alter table public.profiles alter column presence_status set not null;
alter table public.profiles alter column presence_updated_at set not null;

alter table public.profiles drop constraint if exists profiles_presence_status_check;
alter table public.profiles
  add constraint profiles_presence_status_check
  check (presence_status in ('active', 'away', 'busy', 'offline'));

create index if not exists idx_profiles_presence_status_updated_at
  on public.profiles (presence_status, presence_updated_at desc);

commit;
