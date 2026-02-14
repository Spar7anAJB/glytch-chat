-- 20260213133000_voice_deafen_state.sql
begin;

alter table public.voice_participants
add column if not exists deafened boolean not null default false;

commit;
