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
