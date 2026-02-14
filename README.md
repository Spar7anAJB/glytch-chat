# Glytch Chat

Glytch Chat now uses a dedicated frontend and backend instead of a single-page-only flow.

## Architecture

- `src/`: Frontend (React + Vite)
- `backend/server.mjs`: Backend API service (explicit route handlers)
- `electron/`: Desktop shell for the frontend

The frontend routes are:

- `#/` landing page
- `#/auth` authentication page
- `#/app` chat workspace

Backend API routes:

- `/api/auth/*` (authentication/session)
- `/api/rest/*` (table reads/writes)
- `/api/rpc/*` (RPC calls)
- `/api/storage/object/*` and `/api/storage/sign/*` (uploads and signed URLs)
- `/api/media/profile-upload/*` (profile/avatar/banner/theme uploads with moderation gate)
- `/api/media/glytch-icon-upload/*` (glytch icon uploads with moderation gate)
- `/api/media/message-upload/*` (message image upload with moderation gate)
- `/api/media/message-ingest` (remote image/GIF ingestion with moderation gate)
- `/api/gifs/search` (GIF search/trending)

## Environment

Frontend:

- `VITE_API_URL=http://127.0.0.1:8787`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`

Backend:

- `API_PORT` (optional, defaults to `8787`)
- `SUPABASE_URL` (optional; falls back to `VITE_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (optional; falls back to `VITE_SUPABASE_ANON_KEY`)
- `SUPABASE_PROFILE_BUCKET` (optional; defaults to `profile-media`)
- `SUPABASE_GLYTCH_BUCKET` (optional; defaults to `glytch-media`)
- `SUPABASE_MESSAGE_BUCKET` (optional; defaults to `message-media`)

### Media Moderation (Phase 2)

Profile/glytch/media uploads and remote message GIF/image links can be routed through backend moderation before storage upload.

- `MEDIA_MODERATION_ENABLED` (`true`/`false`; defaults to auto-enabled when Sightengine creds are present)
- `MEDIA_MODERATION_PROVIDER` (`sightengine` or `none`; defaults to `sightengine`)
- `MEDIA_MODERATION_NUDITY_THRESHOLD` (0-1 float; defaults to `0.65`)
- `MEDIA_MODERATION_FAIL_OPEN` (`true`/`false`; defaults to `false`)
- `MAX_MEDIA_UPLOAD_BYTES` (defaults to `8388608`, 8MB)
- `SIGHTENGINE_API_USER` (required for `sightengine`)
- `SIGHTENGINE_API_SECRET` (required for `sightengine`)
- `SIGHTENGINE_API_URL` (optional; defaults to `https://api.sightengine.com/1.0/check.json`)

## Run

### Full stack (frontend + backend)

```bash
npm run dev:full
```

### Frontend only

```bash
npm run dev
```

### Backend only

```bash
npm run backend:dev
```

### Build frontend

```bash
npm run build
```

## Electron

### Dev

```bash
npm run electron:dev
```

This starts backend + frontend dev server + Electron.
DevTools are disabled by default for performance. To open them, run with `ELECTRON_OPEN_DEVTOOLS=1`.

### Start built renderer

```bash
npm run electron:start
```

This starts backend, then launches Electron loading `dist/index.html`.
