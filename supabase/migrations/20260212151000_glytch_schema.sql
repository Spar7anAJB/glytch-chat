-- 20260212151000_glytch_schema.sql
begin;
create table if not exists public.glytches (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 64),
  invite_code text not null unique default lower(encode(gen_random_bytes(4), 'hex')),
  created_at timestamptz not null default now()
);

create table if not exists public.glytch_members (
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (glytch_id, user_id)
);

create table if not exists public.glytch_roles (
  id bigint generated always as identity primary key,
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  color text not null default '#8eaefb',
  priority integer not null default 10,
  is_system boolean not null default false,
  is_default boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (glytch_id, name)
);

create table if not exists public.glytch_member_roles (
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id bigint not null references public.glytch_roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (glytch_id, user_id, role_id)
);

create table if not exists public.glytch_channels (
  id bigint generated always as identity primary key,
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 48),
  kind text not null default 'text' check (kind in ('text', 'voice')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (glytch_id, name)
);

alter table public.glytch_channels add column if not exists kind text;
update public.glytch_channels set kind = 'text' where kind is null;
alter table public.glytch_channels alter column kind set default 'text';
alter table public.glytch_channels alter column kind set not null;
alter table public.glytch_channels drop constraint if exists glytch_channels_kind_check;
alter table public.glytch_channels add constraint glytch_channels_kind_check check (kind in ('text', 'voice'));

create table if not exists public.glytch_channel_role_permissions (
  glytch_id bigint not null references public.glytches(id) on delete cascade,
  role_id bigint not null references public.glytch_roles(id) on delete cascade,
  channel_id bigint not null references public.glytch_channels(id) on delete cascade,
  can_view boolean not null default true,
  can_send_messages boolean not null default true,
  can_join_voice boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (glytch_id, role_id, channel_id)
);

create table if not exists public.glytch_messages (
  id bigint generated always as identity primary key,
  glytch_channel_id bigint not null references public.glytch_channels(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

alter table public.glytches enable row level security;
alter table public.glytch_members enable row level security;
alter table public.glytch_roles enable row level security;
alter table public.glytch_member_roles enable row level security;
alter table public.glytch_channel_role_permissions enable row level security;
alter table public.glytch_channels enable row level security;
alter table public.glytch_messages enable row level security;

commit;
