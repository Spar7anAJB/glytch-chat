# Supabase SQL Migrations

This project now uses incremental SQL files in `supabase/migrations` instead of relying on one large `supabase.sql` script.

## Migration Order

Run these files in lexicographic order:

1. `supabase/migrations/20260212150000_profiles_friends_dm.sql`
2. `supabase/migrations/20260212151000_glytch_schema.sql`
3. `supabase/migrations/20260212152000_glytch_permissions_and_rpcs.sql`
4. `supabase/migrations/20260212153000_voice_and_storage.sql`
5. `supabase/migrations/20260212154000_glytch_icons.sql`
6. `supabase/migrations/20260212155000_fix_glytch_icon_storage_rls.sql`
7. `supabase/migrations/20260212160000_channel_create_policy_owner_admin_or_role.sql`
8. `supabase/migrations/20260212161000_glytch_profile_settings.sql`
9. `supabase/migrations/20260212162000_unfriend_rpc.sql`
10. `supabase/migrations/20260212163000_dm_read_receipts.sql`
11. `supabase/migrations/20260212164000_delete_glytch_rpc.sql`
12. `supabase/migrations/20260212165000_default_voice_channel_on_create.sql`
13. `supabase/migrations/20260212170000_message_media.sql`
14. `supabase/migrations/20260212171000_message_reactions.sql`

Important: the lines above are file names, not SQL statements.

If you use the Supabase CLI, put these files in the same order and run:

```bash
supabase db push
```

If you use the Supabase dashboard SQL editor, run each file one-by-one in the same order.
For the SQL editor:

1. Open the migration file locally.
2. Copy its SQL contents.
3. Paste the SQL into the editor.
4. Click Run.

## GIF Search Provider (GIPHY)

The built-in GIF picker now uses the GIPHY API directly from the frontend.

Required configuration:

- `VITE_GIPHY_API_KEY` (required)

Optional configuration:

- `VITE_GIPHY_API_BASE` (defaults to `https://api.giphy.com/v1/gifs`)
- `VITE_GIPHY_RATING` (defaults to `pg`)

## Create Next Migration

1. Copy `supabase/migrations/00000000000000_template.sql`
2. Rename it to `YYYYMMDDHHMMSS_short_description.sql` (UTC timestamp)
3. Add your SQL
4. Run it after the existing latest migration

## Notes

- Each migration is wrapped in `begin; ... commit;`.
- Statements are idempotent where possible (`if exists` / `if not exists` / `create or replace`).
- Keep `supabase.sql` as a historical consolidated script; add future changes as new migration files.
