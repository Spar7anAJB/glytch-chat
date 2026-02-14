-- 20260212160000_channel_create_policy_owner_admin_or_role.sql
begin;

drop policy if exists "members can create channels" on public.glytch_channels;
create policy "members can create channels"
on public.glytch_channels
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_glytch_owner_or_admin(glytch_channels.glytch_id, auth.uid())
    or public.glytch_has_permission(glytch_channels.glytch_id, auth.uid(), 'manage_channels')
  )
);

commit;
