Krisp SDK assets
================

Place Krisp Browser SDK files in this folder for live voice suppression in Electron.

Expected paths used by the app:

- `public/krisp/dist/krispsdk.mjs`
- `public/krisp/dist/models/model_nc.kef`
- `public/krisp/dist/models/model_8.kef`
- Optional: `public/krisp/dist/models/model_bvc.kef`
- Optional: `public/krisp/dist/assets/bvc-allowed.txt`

Enable integration in your `.env.production` (or `.env.local`):

- `VITE_KRISP_ENABLED=true`
- Optional override: `VITE_KRISP_MODULE_URL=/krisp/dist/krispsdk.mjs`
- Optional override: `VITE_KRISP_MODEL_NC_URL=/krisp/dist/models/model_nc.kef`
- Optional override: `VITE_KRISP_MODEL_8_URL=/krisp/dist/models/model_8.kef`
- Optional override: `VITE_KRISP_MODEL_BVC_URL=/krisp/dist/models/model_bvc.kef`
- Optional override: `VITE_KRISP_BVC_ALLOWED_DEVICES_URL=/krisp/dist/assets/bvc-allowed.txt`

If assets are missing or unsupported on a device, the app automatically falls back to browser/WebRTC suppression.
