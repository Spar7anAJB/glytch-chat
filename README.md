# Glytch Chat

Glytch Chat now uses a dedicated frontend and backend instead of a single-page-only flow.

## Architecture

- `src/`: Frontend (React + Vite)
- `backend/server.mjs`: Backend API service (explicit route handlers)
- `electron/`: Desktop shell for the frontend

The frontend routes are:

- `#/` landing page
- `#/download` desktop installer downloads
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
- `/api/updates/{platform}/latest` (desktop app update manifest for in-app updater)

## Environment

Frontend:

- `VITE_API_URL=http://127.0.0.1:8787`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- `VITE_ELECTRON_INSTALLER_URL` (optional; absolute URL for desktop installer download button on landing page)
- `VITE_ELECTRON_INSTALLER_URL_MAC` (optional; overrides macOS installer URL)
- `VITE_ELECTRON_INSTALLER_URL_WIN` (optional; overrides Windows installer URL)
- `VITE_ELECTRON_INSTALLER_URL_LINUX` (optional; overrides Linux installer URL)
- `VITE_KRISP_ENABLED` (`true`/`false`; optional; enables Krisp live suppression pipeline in desktop runtime)
- `VITE_KRISP_MODULE_URL` (optional; defaults to `/krisp/dist/krispsdk.mjs`)
- `VITE_KRISP_MODEL_NC_URL` (optional; defaults to `/krisp/dist/models/model_nc.kef`)
- `VITE_KRISP_MODEL_8_URL` (optional; defaults to `/krisp/dist/models/model_8.kef`)
- `VITE_KRISP_MODEL_BVC_URL` (optional; enables BVC model when set)
- `VITE_KRISP_BVC_ALLOWED_DEVICES_URL` (optional; used with BVC model)

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

Use Node `22.12+` (or `20.19+`). Node `21.x` is not supported by Vite 7 and can cause build/package issues.

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
If backend is already running on `127.0.0.1:8787`, the runner reuses it.

### Start built renderer

```bash
npm run electron:start
```

This starts backend, then launches Electron loading `dist/index.html`.

### Build installers

Install dependencies once before packaging:

```bash
npm install
```

```bash
npm run electron:installer:mac
```

Builds a signed-off development DMG artifact using `electron-builder`, then copies it to `public/downloads/glytch-chat-installer.dmg`.
The mac build runs in a temporary non-iCloud staging directory to avoid File Provider xattr signing failures.

```bash
npm run electron:installer:win
```

Builds a Windows NSIS `.exe` installer and copies it to `public/downloads/glytch-chat-setup.exe`.

```bash
npm run electron:installer:all
```

Builds both targets and syncs any produced artifacts into `public/downloads/`.
The sync step now also writes `public/downloads/updates.json` with per-platform version/checksum metadata.

### Installer download fallback

If explicit installer URLs are not set, the web app uses backend download routes:

- `/api/downloads/mac`
- `/api/downloads/windows`
- `/api/downloads/linux`
- `/api/updates/mac/latest`
- `/api/updates/windows/latest`
- `/api/updates/linux/latest`

Those endpoints serve installers from:

1. `public/downloads/` (preferred)
2. `release/` (fallback scan for latest matching artifact)

- macOS: `glytch-chat-installer.dmg`
- Windows: `glytch-chat-setup.exe`
- Linux: `glytch-chat.AppImage`

If an installer file is missing, the backend returns a 404 JSON error instead of serving a fallback HTML file.

For static-only deployments (Cloudflare Pages/Workers assets without the Node backend), set explicit installer URLs via
`VITE_ELECTRON_INSTALLER_URL_MAC`, `VITE_ELECTRON_INSTALLER_URL_WIN`, and optionally `VITE_ELECTRON_INSTALLER_URL_LINUX`.
Otherwise, the download buttons are shown as unavailable.

### Desktop in-app updater (Windows)

The desktop app now exposes a **System Settings -> Accessibility -> Desktop App Version** panel in Electron builds.
On Windows it can:

1. Check `/api/updates/windows/latest` for newer versions.
2. Download the installer from `/api/downloads/windows`.
3. Launch the installer and close the current app so update can proceed.

For update detection to work, bump `package.json` version before building installers.

### Krisp live noise suppression (desktop)

This app supports Krisp Browser SDK integration in voice calls and falls back to native WebRTC suppression if Krisp is unavailable.

1. Get Krisp SDK package access from Krisp.
2. Copy SDK assets into `public/krisp/` (see `public/krisp/README.md` for exact paths).
3. Set `VITE_KRISP_ENABLED=true` in your build env.
4. Rebuild desktop packages.

### macOS launch note

Installer builds are ad-hoc signed for local use. If macOS still blocks launch after download, clear quarantine attributes:

```bash
xattr -dr com.apple.quarantine "/Applications/Glytch Chat.app"
```

If you still see a damaged warning, remove the old app and reinstall from a fresh DMG build:

```bash
rm -rf "/Applications/Glytch Chat.app"
npm run electron:installer:mac
npm run electron:installer:sync
```

If `electron:installer:mac` fails with `resource fork, Finder information, or similar detritus not allowed`, rebuild after cleaning release output:

```bash
rm -rf release
npm run electron:installer:mac
```

If installer build fails, do not run `npm run electron:installer:sync`, because it may copy a stale DMG from an earlier run.

The macOS installer script now cleans `release/` automatically and sets `COPYFILE_DISABLE=1` during build to reduce Finder metadata issues.
