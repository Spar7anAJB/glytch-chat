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
- `/api/voice/livekit-token` (mint short-lived LiveKit auth tokens for desktop noise suppression)
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
- `VITE_RNNOISE_ENABLED` (`true`/`false`; optional; defaults to `true`; enables bundled RNNoise suppression in desktop runtime)
- `VITE_LIVEKIT_KRISP_ENABLED` (`true`/`false`; optional; defaults to `false`; enables LiveKit enhanced suppression before RNNoise fallback)

Backend:

- `API_PORT` (optional, defaults to `8787`)
- `SUPABASE_URL` (optional; falls back to `VITE_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (optional; falls back to `VITE_SUPABASE_ANON_KEY`)
- `SUPABASE_PROFILE_BUCKET` (optional; defaults to `profile-media`)
- `SUPABASE_GLYTCH_BUCKET` (optional; defaults to `glytch-media`)
- `SUPABASE_MESSAGE_BUCKET` (optional; defaults to `message-media`)
- `GIPHY_API_KEY` (recommended for GIF search/trending)
- `GIPHY_RATING` (optional; defaults to `pg`)
- `TENOR_API_KEY` (optional fallback if GIPHY is unavailable)
- `TENOR_CLIENT_KEY` (optional; defaults to `glytch-chat`)
- `LIVEKIT_URL` (required for LiveKit Krisp token minting; ws/wss URL)
- `LIVEKIT_API_KEY` (required for LiveKit Krisp token minting)
- `LIVEKIT_API_SECRET` (required for LiveKit Krisp token minting)
- `LIVEKIT_KRISP_TOKEN_TTL_SECONDS` (optional; defaults to `300`; range `60-3600`)

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

### Voice noise suppression (desktop)

This app tries LiveKit enhanced suppression first (optional), then falls back to bundled RNNoise, then native WebRTC suppression.

1. Optional: set `VITE_LIVEKIT_KRISP_ENABLED=true` on frontend and configure backend with `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`.
2. RNNoise is enabled by default (`VITE_RNNOISE_ENABLED=true`).
3. Rebuild desktop packages.

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
