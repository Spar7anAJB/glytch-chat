import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  const lines = contents.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadWorkspaceEnv() {
  const roots = new Set([process.cwd(), path.resolve(__dirname, "..")]);
  for (const root of roots) {
    loadEnvFile(path.join(root, ".env"));
    loadEnvFile(path.join(root, ".env.local"));
  }
}

loadWorkspaceEnv();

const API_PORT = Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? "8787", 10);
const API_HOST = process.env.PORT ? "0.0.0.0" : process.env.API_HOST ?? "127.0.0.1";
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const PROFILE_BUCKET = process.env.SUPABASE_PROFILE_BUCKET || process.env.VITE_SUPABASE_PROFILE_BUCKET || "profile-media";
const GLYTCH_BUCKET = process.env.SUPABASE_GLYTCH_BUCKET || process.env.VITE_SUPABASE_GLYTCH_BUCKET || "glytch-media";
const MESSAGE_BUCKET = process.env.SUPABASE_MESSAGE_BUCKET || process.env.VITE_SUPABASE_MESSAGE_BUCKET || "message-media";
const GIPHY_API_BASE = (process.env.GIPHY_API_BASE || process.env.VITE_GIPHY_API_BASE || "https://api.giphy.com/v1/gifs").replace(
  /\/+$/,
  "",
);
const GIPHY_API_KEY = (process.env.GIPHY_API_KEY || process.env.VITE_GIPHY_API_KEY || "").trim();
const GIPHY_RATING = (process.env.GIPHY_RATING || process.env.VITE_GIPHY_RATING || "pg").trim();
const TENOR_API_BASE = (process.env.TENOR_API_BASE || process.env.VITE_TENOR_API_BASE || "https://tenor.googleapis.com/v2").replace(
  /\/+$/,
  "",
);
const TENOR_API_KEY = (process.env.TENOR_API_KEY || process.env.VITE_TENOR_API_KEY || "").trim();
const TENOR_CLIENT_KEY = (process.env.TENOR_CLIENT_KEY || process.env.VITE_TENOR_CLIENT_KEY || "glytch-chat").trim();
const MAX_MEDIA_UPLOAD_BYTES = Number.parseInt(process.env.MAX_MEDIA_UPLOAD_BYTES ?? "8388608", 10);
const MEDIA_MODERATION_ENABLED = parseBooleanEnv(
  process.env.MEDIA_MODERATION_ENABLED,
  Boolean(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET),
);
const MEDIA_MODERATION_FAIL_OPEN = parseBooleanEnv(process.env.MEDIA_MODERATION_FAIL_OPEN, false);
const MEDIA_MODERATION_PROVIDER = (process.env.MEDIA_MODERATION_PROVIDER || "sightengine").trim().toLowerCase();
const MEDIA_MODERATION_NUDITY_THRESHOLD = clampNumber(
  Number.parseFloat(process.env.MEDIA_MODERATION_NUDITY_THRESHOLD ?? "0.65"),
  0,
  1,
  0.65,
);
const SIGHTENGINE_API_URL = (process.env.SIGHTENGINE_API_URL || "https://api.sightengine.com/1.0/check.json").replace(/\/+$/, "");
const SIGHTENGINE_API_USER = process.env.SIGHTENGINE_API_USER || "";
const SIGHTENGINE_API_SECRET = process.env.SIGHTENGINE_API_SECRET || "";

const CORS_ALLOW_HEADERS = [
  "Authorization",
  "Content-Type",
  "Accept",
  "Range",
  "apikey",
  "x-client-info",
  "prefer",
  "x-upsert",
].join(",");
const CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"].join(",");

const AUTH_PREFIX = "/api/auth/";
const RPC_PREFIX = "/api/rpc/";
const REST_PREFIX = "/api/rest/";
const STORAGE_OBJECT_PREFIX = "/api/storage/object/";
const STORAGE_SIGN_PREFIX = "/api/storage/sign/";
const MEDIA_PROFILE_UPLOAD_PREFIX = "/api/media/profile-upload/";
const MEDIA_GLYTCH_ICON_UPLOAD_PREFIX = "/api/media/glytch-icon-upload/";
const MEDIA_MESSAGE_UPLOAD_PREFIX = "/api/media/message-upload/";
const MEDIA_MESSAGE_INGEST_PATH = "/api/media/message-ingest";
const UPDATES_PREFIX = "/api/updates/";
const DOWNLOADS_PREFIX = "/api/downloads/";
const DOWNLOADS_DIR = path.join(process.cwd(), "public", "downloads");
const RELEASE_DIR = path.join(process.cwd(), "release");
const DOWNLOADS_UPDATES_MANIFEST_PATH = path.join(DOWNLOADS_DIR, "updates.json");
const PACKAGE_JSON_PATH = path.join(process.cwd(), "package.json");

const INSTALLER_FILE_MAP = {
  mac: {
    fileName: "glytch-chat-installer.dmg",
    contentType: "application/x-apple-diskimage",
    matchesReleaseArtifact: (candidate) => candidate.name.toLowerCase().endsWith(".dmg"),
    buildCommand: "npm run electron:installer:mac",
  },
  windows: {
    fileName: "glytch-chat-setup.exe",
    contentType: "application/vnd.microsoft.portable-executable",
    minBytes: 5 * 1024 * 1024,
    matchesReleaseArtifact: (candidate) => {
      const normalizedName = candidate.name.toLowerCase();
      const normalizedPath = candidate.relativePath.toLowerCase();
      const looksLikeInstaller =
        normalizedName.includes("setup") || /-win-(x64|arm64|ia32)\.exe$/.test(normalizedName);
      const looksLikeUninstaller = normalizedName.includes("uninstall") || normalizedName.includes(".__uninstaller");
      const fromUnpackedDir = normalizedPath.includes("win-unpacked/");

      return (
        normalizedName.endsWith(".exe") &&
        looksLikeInstaller &&
        !looksLikeUninstaller &&
        !fromUnpackedDir &&
        candidate.sizeBytes >= 5 * 1024 * 1024
      );
    },
    buildCommand: "npm run electron:installer:win",
  },
  linux: {
    fileName: "glytch-chat.AppImage",
    contentType: "application/octet-stream",
    matchesReleaseArtifact: (candidate) => candidate.name.endsWith(".AppImage"),
    buildCommand: "npm run electron:installer:all",
  },
};

function parseBooleanEnv(rawValue, defaultValue) {
  if (typeof rawValue !== "string") return defaultValue;
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") return false;
  return defaultValue;
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function contentTypeFromHeaders(req) {
  const raw = req.headers["content-type"];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first || typeof first !== "string") return "";
  return first.split(";")[0].trim().toLowerCase();
}

function encodePath(pathValue) {
  return pathValue
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function decodePath(pathValue) {
  try {
    return pathValue
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
  } catch {
    return "";
  }
}

function isSafeStorageObjectPath(pathValue) {
  if (!pathValue || pathValue.startsWith("/") || pathValue.includes("\\") || pathValue.includes("\0")) {
    return false;
  }
  const parts = pathValue.split("/");
  if (parts.length < 2) return false;
  return parts.every((part) => part && part !== "." && part !== "..");
}

function extractBearerToken(req) {
  const rawAuth = req.headers.authorization;
  const value = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  if (!value || typeof value !== "string") return null;
  const [scheme, token] = value.trim().split(/\s+/, 2);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function decodeBase64Url(rawValue) {
  const normalized = rawValue.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : `${normalized}${"=".repeat(4 - padding)}`;
  return Buffer.from(padded, "base64").toString("utf8");
}

function getRequestUserId(req) {
  const token = extractBearerToken(req);
  if (!token) return null;
  const tokenParts = token.split(".");
  if (tokenParts.length < 2) return null;

  try {
    const payloadJson = decodeBase64Url(tokenParts[1]);
    const payload = JSON.parse(payloadJson);
    if (payload && typeof payload === "object" && typeof payload.sub === "string" && payload.sub) {
      return payload.sub;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizedImageContentType(rawContentType) {
  if (!rawContentType || typeof rawContentType !== "string") return "";
  const clean = rawContentType.split(";")[0].trim().toLowerCase();
  if (!clean.startsWith("image/")) return "";
  return clean;
}

function errorMessageForMaxUploadBytes(maxBytes) {
  return `Uploads must be ${Math.floor(maxBytes / (1024 * 1024))}MB or smaller.`;
}

function sanitizeAssetName(rawName, fallbackBaseName = "upload-image") {
  const base = rawName && typeof rawName === "string" ? rawName : fallbackBaseName;
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.length > 0 ? cleaned : fallbackBaseName;
}

function extensionForContentType(contentType) {
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/bmp") return "bmp";
  if (contentType === "image/tiff") return "tiff";
  if (contentType === "image/avif") return "avif";
  return "jpg";
}

function isDisallowedRemoteHost(hostname) {
  const host = hostname.trim().toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.endsWith(".local")) return true;
  if (host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("169.254.")) return true;

  const private172 = host.match(/^172\.(\d+)\./);
  if (private172) {
    const secondOctet = Number.parseInt(private172[1], 10);
    if (Number.isFinite(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

function parseRemoteMediaUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (isDisallowedRemoteHost(parsed.hostname)) return null;
  return parsed;
}

function getUnknownMessage(data) {
  if (!data || typeof data !== "object") return "";
  const row = data;
  if (typeof row.message === "string" && row.message) return row.message;
  if (typeof row.error === "string" && row.error) return row.error;
  if (typeof row.msg === "string" && row.msg) return row.msg;
  if (typeof row.error_description === "string" && row.error_description) return row.error_description;
  return "";
}

function toFiniteScore(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

async function moderateImageWithSightengine(imageBuffer, contentType) {
  if (!SIGHTENGINE_API_USER || !SIGHTENGINE_API_SECRET) {
    return {
      allowed: MEDIA_MODERATION_FAIL_OPEN,
      statusCode: 503,
      code: "MODERATION_NOT_CONFIGURED",
      reason: "Image moderation is enabled but Sightengine credentials are missing.",
      provider: "sightengine",
    };
  }

  const formData = new FormData();
  formData.set("media", new Blob([imageBuffer], { type: contentType || "application/octet-stream" }), "upload-image");
  formData.set("models", "nudity-2.1");
  formData.set("api_user", SIGHTENGINE_API_USER);
  formData.set("api_secret", SIGHTENGINE_API_SECRET);

  let upstream;
  try {
    upstream = await fetch(SIGHTENGINE_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });
  } catch (error) {
    return {
      allowed: MEDIA_MODERATION_FAIL_OPEN,
      statusCode: 503,
      code: "MODERATION_UPSTREAM_UNAVAILABLE",
      reason: error instanceof Error ? error.message : "Moderation provider could not be reached.",
      provider: "sightengine",
    };
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return {
      allowed: MEDIA_MODERATION_FAIL_OPEN,
      statusCode: 503,
      code: "MODERATION_UPSTREAM_ERROR",
      reason: getUnknownMessage(data) || "Moderation provider returned an error.",
      provider: "sightengine",
    };
  }

  const nudity = data?.nudity && typeof data.nudity === "object" ? data.nudity : {};
  const score = Math.max(
    toFiniteScore(nudity.raw),
    toFiniteScore(nudity.partial),
    toFiniteScore(nudity.suggestive),
    toFiniteScore(nudity.sexual_activity),
  );

  return {
    allowed: score < MEDIA_MODERATION_NUDITY_THRESHOLD,
    statusCode: 422,
    code: "NSFW_IMAGE_BLOCKED",
    reason: "Image was blocked by moderation policy.",
    provider: "sightengine",
    score,
    threshold: MEDIA_MODERATION_NUDITY_THRESHOLD,
  };
}

async function moderateImageUpload(imageBuffer, contentType) {
  if (!MEDIA_MODERATION_ENABLED) {
    return {
      allowed: true,
      provider: "disabled",
    };
  }

  if (MEDIA_MODERATION_PROVIDER === "sightengine") {
    return moderateImageWithSightengine(imageBuffer, contentType);
  }

  if (MEDIA_MODERATION_PROVIDER === "none") {
    return {
      allowed: true,
      provider: "none",
    };
  }

  return {
    allowed: false,
    statusCode: 500,
    code: "MODERATION_PROVIDER_UNSUPPORTED",
    reason: `Unsupported moderation provider: ${MEDIA_MODERATION_PROVIDER}.`,
    provider: MEDIA_MODERATION_PROVIDER,
  };
}

function moderationErrorPayload(moderation) {
  return {
    error: moderation.reason || "Upload blocked by moderation policy.",
    code: moderation.code || "UPLOAD_BLOCKED",
    moderation: {
      provider: moderation.provider,
      score: moderation.score ?? null,
      threshold: moderation.threshold ?? null,
    },
  };
}

async function uploadBufferToSupabaseStorage(req, bucket, objectPath, contentType, body) {
  const headers = buildUpstreamHeaders(req, body.length);
  headers.set("content-type", contentType || "application/octet-stream");
  headers.set("x-upsert", "true");
  return fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodePath(objectPath)}`, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });
}

function publicStorageUrl(bucket, objectPath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodePath(objectPath)}`;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function applyCors(req, res) {
  const originHeader = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", typeof originHeader === "string" ? originHeader : "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
  res.setHeader("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function isBodyMethod(method) {
  return method !== "GET" && method !== "HEAD";
}

function buildUpstreamHeaders(req, bodyLength) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const lowerKey = key.toLowerCase();
    if (lowerKey === "host" || lowerKey === "connection" || lowerKey === "content-length") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    headers.set(key, value);
  }

  if (SUPABASE_ANON_KEY) {
    headers.set("apikey", SUPABASE_ANON_KEY);
  }

  if (bodyLength <= 0) {
    headers.delete("content-type");
  }

  return headers;
}

async function relayFetchResponse(res, upstream) {
  res.statusCode = upstream.status;
  for (const [key, value] of upstream.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "connection" || lowerKey === "transfer-encoding" || lowerKey === "content-encoding") {
      continue;
    }
    if (lowerKey.startsWith("access-control-")) {
      continue;
    }
    res.setHeader(key, value);
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.end(buffer);
}

async function uploadModeratedMessageMedia(req, res, parsedUrl, pathname) {
  const method = req.method || "GET";
  if (method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!SUPABASE_URL) {
    sendJson(res, 500, {
      error: "Backend is missing SUPABASE_URL (or VITE_SUPABASE_URL).",
    });
    return;
  }

  const authUserId = getRequestUserId(req);
  if (!authUserId) {
    sendJson(res, 401, { error: "Missing or invalid bearer token." });
    return;
  }

  const encodedObjectPath = pathname.slice(MEDIA_MESSAGE_UPLOAD_PREFIX.length);
  if (!encodedObjectPath) {
    sendJson(res, 400, { error: "Missing upload path." });
    return;
  }

  const objectPath = decodePath(encodedObjectPath);
  if (!isSafeStorageObjectPath(objectPath)) {
    sendJson(res, 400, { error: "Invalid upload path." });
    return;
  }

  const context = parsedUrl.searchParams.get("context");
  if (context !== "dm" && context !== "group" && context !== "glytch") {
    sendJson(res, 400, { error: "Invalid upload context." });
    return;
  }

  const contextId = Number.parseInt(parsedUrl.searchParams.get("contextId") || "", 10);
  if (!Number.isFinite(contextId) || contextId <= 0) {
    sendJson(res, 400, { error: "Invalid upload context id." });
    return;
  }

  const pathParts = objectPath.split("/");
  if (pathParts.length < 4 || pathParts[0] !== context || pathParts[1] !== String(contextId)) {
    sendJson(res, 400, { error: "Upload path does not match the selected context." });
    return;
  }
  if (pathParts[2] !== authUserId) {
    sendJson(res, 403, { error: "Upload path user mismatch." });
    return;
  }

  const contentType = normalizedImageContentType(contentTypeFromHeaders(req));
  if (!contentType) {
    sendJson(res, 415, { error: "Only image uploads are supported." });
    return;
  }

  const body = await readRawBody(req);
  if (!body.length) {
    sendJson(res, 400, { error: "Upload body is empty." });
    return;
  }
  if (body.length > MAX_MEDIA_UPLOAD_BYTES) {
    sendJson(res, 413, { error: errorMessageForMaxUploadBytes(MAX_MEDIA_UPLOAD_BYTES) });
    return;
  }

  const moderation = await moderateImageUpload(body, contentType);
  if (!moderation.allowed) {
    sendJson(res, moderation.statusCode || 422, moderationErrorPayload(moderation));
    return;
  }

  let upstream;
  try {
    upstream = await uploadBufferToSupabaseStorage(req, MESSAGE_BUCKET, objectPath, contentType, body);
  } catch (error) {
    sendJson(res, 502, {
      error: "Could not reach Supabase storage upstream.",
      message: error instanceof Error ? error.message : "Unknown upstream error.",
    });
    return;
  }

  if (!upstream.ok) {
    await relayFetchResponse(res, upstream);
    return;
  }

  await upstream.arrayBuffer();
  sendJson(res, 200, {
    objectPath,
    attachmentType: contentType === "image/gif" ? "gif" : "image",
    moderation: {
      provider: moderation.provider,
      score: moderation.score ?? null,
      threshold: moderation.threshold ?? null,
    },
  });
}

async function uploadModeratedProfileMedia(req, res, parsedUrl, pathname) {
  const method = req.method || "GET";
  if (method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!SUPABASE_URL) {
    sendJson(res, 500, {
      error: "Backend is missing SUPABASE_URL (or VITE_SUPABASE_URL).",
    });
    return;
  }

  const authUserId = getRequestUserId(req);
  if (!authUserId) {
    sendJson(res, 401, { error: "Missing or invalid bearer token." });
    return;
  }

  const kind = (parsedUrl.searchParams.get("kind") || "").trim().toLowerCase();
  if (kind !== "avatar" && kind !== "banner" && kind !== "theme") {
    sendJson(res, 400, { error: "Invalid profile upload kind." });
    return;
  }

  const encodedObjectPath = pathname.slice(MEDIA_PROFILE_UPLOAD_PREFIX.length);
  if (!encodedObjectPath) {
    sendJson(res, 400, { error: "Missing upload path." });
    return;
  }

  const objectPath = decodePath(encodedObjectPath);
  if (!isSafeStorageObjectPath(objectPath)) {
    sendJson(res, 400, { error: "Invalid upload path." });
    return;
  }

  const parts = objectPath.split("/");
  if (parts.length !== 2 || parts[0] !== authUserId || !parts[1].startsWith(`${kind}-`)) {
    sendJson(res, 403, { error: "Upload path does not match authenticated user or kind." });
    return;
  }

  const contentType = normalizedImageContentType(contentTypeFromHeaders(req));
  if (!contentType) {
    sendJson(res, 415, { error: "Only image uploads are supported." });
    return;
  }

  const body = await readRawBody(req);
  if (!body.length) {
    sendJson(res, 400, { error: "Upload body is empty." });
    return;
  }
  if (body.length > MAX_MEDIA_UPLOAD_BYTES) {
    sendJson(res, 413, { error: errorMessageForMaxUploadBytes(MAX_MEDIA_UPLOAD_BYTES) });
    return;
  }

  const moderation = await moderateImageUpload(body, contentType);
  if (!moderation.allowed) {
    sendJson(res, moderation.statusCode || 422, moderationErrorPayload(moderation));
    return;
  }

  let upstream;
  try {
    upstream = await uploadBufferToSupabaseStorage(req, PROFILE_BUCKET, objectPath, contentType, body);
  } catch (error) {
    sendJson(res, 502, {
      error: "Could not reach Supabase storage upstream.",
      message: error instanceof Error ? error.message : "Unknown upstream error.",
    });
    return;
  }

  if (!upstream.ok) {
    await relayFetchResponse(res, upstream);
    return;
  }

  await upstream.arrayBuffer();
  sendJson(res, 200, {
    url: publicStorageUrl(PROFILE_BUCKET, objectPath),
    moderation: {
      provider: moderation.provider,
      score: moderation.score ?? null,
      threshold: moderation.threshold ?? null,
    },
  });
}

async function uploadModeratedGlytchIcon(req, res, parsedUrl, pathname) {
  const method = req.method || "GET";
  if (method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!SUPABASE_URL) {
    sendJson(res, 500, {
      error: "Backend is missing SUPABASE_URL (or VITE_SUPABASE_URL).",
    });
    return;
  }

  const authUserId = getRequestUserId(req);
  if (!authUserId) {
    sendJson(res, 401, { error: "Missing or invalid bearer token." });
    return;
  }

  const glytchId = Number.parseInt(parsedUrl.searchParams.get("glytchId") || "", 10);
  if (!Number.isFinite(glytchId) || glytchId <= 0) {
    sendJson(res, 400, { error: "Invalid glytch id." });
    return;
  }

  const encodedObjectPath = pathname.slice(MEDIA_GLYTCH_ICON_UPLOAD_PREFIX.length);
  if (!encodedObjectPath) {
    sendJson(res, 400, { error: "Missing upload path." });
    return;
  }

  const objectPath = decodePath(encodedObjectPath);
  if (!isSafeStorageObjectPath(objectPath)) {
    sendJson(res, 400, { error: "Invalid upload path." });
    return;
  }

  const parts = objectPath.split("/");
  if (parts.length !== 3 || parts[0] !== authUserId || parts[1] !== String(glytchId) || !parts[2].startsWith("icon-")) {
    sendJson(res, 403, { error: "Upload path does not match authenticated user or glytch id." });
    return;
  }

  const contentType = normalizedImageContentType(contentTypeFromHeaders(req));
  if (!contentType) {
    sendJson(res, 415, { error: "Only image uploads are supported." });
    return;
  }

  const body = await readRawBody(req);
  if (!body.length) {
    sendJson(res, 400, { error: "Upload body is empty." });
    return;
  }
  if (body.length > MAX_MEDIA_UPLOAD_BYTES) {
    sendJson(res, 413, { error: errorMessageForMaxUploadBytes(MAX_MEDIA_UPLOAD_BYTES) });
    return;
  }

  const moderation = await moderateImageUpload(body, contentType);
  if (!moderation.allowed) {
    sendJson(res, moderation.statusCode || 422, moderationErrorPayload(moderation));
    return;
  }

  let upstream;
  try {
    upstream = await uploadBufferToSupabaseStorage(req, GLYTCH_BUCKET, objectPath, contentType, body);
  } catch (error) {
    sendJson(res, 502, {
      error: "Could not reach Supabase storage upstream.",
      message: error instanceof Error ? error.message : "Unknown upstream error.",
    });
    return;
  }

  if (!upstream.ok) {
    await relayFetchResponse(res, upstream);
    return;
  }

  await upstream.arrayBuffer();
  sendJson(res, 200, {
    url: publicStorageUrl(GLYTCH_BUCKET, objectPath),
    moderation: {
      provider: moderation.provider,
      score: moderation.score ?? null,
      threshold: moderation.threshold ?? null,
    },
  });
}

async function ingestRemoteMessageMedia(req, res, parsedUrl) {
  const method = req.method || "GET";
  if (method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!SUPABASE_URL) {
    sendJson(res, 500, {
      error: "Backend is missing SUPABASE_URL (or VITE_SUPABASE_URL).",
    });
    return;
  }

  const authUserId = getRequestUserId(req);
  if (!authUserId) {
    sendJson(res, 401, { error: "Missing or invalid bearer token." });
    return;
  }

  const context = parsedUrl.searchParams.get("context");
  if (context !== "dm" && context !== "group" && context !== "glytch") {
    sendJson(res, 400, { error: "Invalid upload context." });
    return;
  }
  const contextId = Number.parseInt(parsedUrl.searchParams.get("contextId") || "", 10);
  if (!Number.isFinite(contextId) || contextId <= 0) {
    sendJson(res, 400, { error: "Invalid upload context id." });
    return;
  }

  const requestBody = await readRawBody(req);
  if (!requestBody.length) {
    sendJson(res, 400, { error: "Missing request body." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(requestBody.toString("utf8"));
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  const sourceUrl = parseRemoteMediaUrl(payload?.sourceUrl);
  if (!sourceUrl) {
    sendJson(res, 400, { error: "Invalid or disallowed source URL." });
    return;
  }

  let remoteResponse;
  try {
    remoteResponse = await fetch(sourceUrl.toString(), {
      headers: {
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
  } catch (error) {
    sendJson(res, 502, {
      error: "Could not download remote media.",
      message: error instanceof Error ? error.message : "Unknown upstream error.",
    });
    return;
  }

  if (!remoteResponse.ok) {
    sendJson(res, 422, {
      error: "Remote media source returned an error.",
      statusCode: remoteResponse.status,
    });
    return;
  }

  const remoteContentType = normalizedImageContentType(remoteResponse.headers.get("content-type") || "");
  if (!remoteContentType) {
    sendJson(res, 415, { error: "Remote media must be an image." });
    return;
  }

  const contentLength = Number.parseInt(remoteResponse.headers.get("content-length") || "", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_UPLOAD_BYTES) {
    sendJson(res, 413, { error: errorMessageForMaxUploadBytes(MAX_MEDIA_UPLOAD_BYTES) });
    return;
  }

  const remoteBuffer = Buffer.from(await remoteResponse.arrayBuffer());
  if (!remoteBuffer.length) {
    sendJson(res, 422, { error: "Remote media content was empty." });
    return;
  }
  if (remoteBuffer.length > MAX_MEDIA_UPLOAD_BYTES) {
    sendJson(res, 413, { error: errorMessageForMaxUploadBytes(MAX_MEDIA_UPLOAD_BYTES) });
    return;
  }

  const moderation = await moderateImageUpload(remoteBuffer, remoteContentType);
  if (!moderation.allowed) {
    sendJson(res, moderation.statusCode || 422, moderationErrorPayload(moderation));
    return;
  }

  const rawSourceName = path.posix.basename(sourceUrl.pathname || "") || "remote-image";
  const safeSourceName = sanitizeAssetName(rawSourceName, "remote-image");
  const sourceHasExtension = /\.[a-zA-Z0-9]+$/.test(safeSourceName);
  const finalSourceName = sourceHasExtension
    ? safeSourceName
    : `${safeSourceName}.${extensionForContentType(remoteContentType)}`;
  const objectPath = `${context}/${contextId}/${authUserId}/${Date.now()}-${finalSourceName}`;

  let upstream;
  try {
    upstream = await uploadBufferToSupabaseStorage(req, MESSAGE_BUCKET, objectPath, remoteContentType, remoteBuffer);
  } catch (error) {
    sendJson(res, 502, {
      error: "Could not reach Supabase storage upstream.",
      message: error instanceof Error ? error.message : "Unknown upstream error.",
    });
    return;
  }

  if (!upstream.ok) {
    await relayFetchResponse(res, upstream);
    return;
  }

  await upstream.arrayBuffer();
  sendJson(res, 200, {
    objectPath,
    attachmentType: remoteContentType === "image/gif" ? "gif" : "image",
    moderation: {
      provider: moderation.provider,
      score: moderation.score ?? null,
      threshold: moderation.threshold ?? null,
    },
  });
}

async function forwardSupabase(req, res, targetPath) {
  if (!SUPABASE_URL) {
    sendJson(res, 500, {
      error: "Backend is missing SUPABASE_URL (or VITE_SUPABASE_URL).",
    });
    return;
  }

  const method = req.method || "GET";
  const body = isBodyMethod(method) ? await readRawBody(req) : null;
  const headers = buildUpstreamHeaders(req, body?.length ?? 0);

  let upstream;
  try {
    upstream = await fetch(`${SUPABASE_URL}${targetPath}`, {
      method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      redirect: "manual",
    });
  } catch (error) {
    sendJson(res, 502, {
      error: "Could not reach Supabase upstream.",
      message: error instanceof Error ? error.message : "Unknown upstream error.",
    });
    return;
  }

  await relayFetchResponse(res, upstream);
}

async function handleGifSearch(res, parsedUrl) {
  const query = parsedUrl.searchParams.get("q")?.trim() || "";
  const rawLimit = Number.parseInt(parsedUrl.searchParams.get("limit") || "24", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 24;
  let giphyFailure = "";

  if (GIPHY_API_KEY) {
    const endpoint = query ? "search" : "trending";
    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      limit: String(limit),
      rating: GIPHY_RATING,
      bundle: "messaging_non_clips",
    });
    if (query) {
      params.set("q", query);
      params.set("lang", "en");
    }

    let upstream;
    try {
      upstream = await fetch(`${GIPHY_API_BASE}/${endpoint}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
        },
      });
    } catch (error) {
      sendJson(res, 502, {
        error: "Could not reach GIF upstream.",
        message: error instanceof Error ? error.message : "Unknown upstream error.",
      });
      return;
    }

    if (upstream.ok) {
      await relayFetchResponse(res, upstream);
      return;
    }

    const upstreamError = await upstream.json().catch(() => ({}));
    const upstreamMessage = getUnknownMessage(upstreamError);
    const statusLabel = `GIPHY request failed (${upstream.status || 502})`;
    giphyFailure = upstreamMessage ? `${statusLabel}: ${upstreamMessage}` : statusLabel;
  }

  if (!TENOR_API_KEY) {
    const troubleshooting = [];
    if (!GIPHY_API_KEY) {
      troubleshooting.push("GIPHY_API_KEY is not configured.");
    }
    if (giphyFailure) {
      troubleshooting.push(giphyFailure);
    }
    troubleshooting.push("TENOR_API_KEY is not configured.");
    sendJson(res, 503, {
      error: "GIF service unavailable.",
      message: troubleshooting.join(" "),
    });
    return;
  }

  const tenorEndpoint = query ? "search" : "featured";
  const tenorParams = new URLSearchParams({
    key: TENOR_API_KEY,
    client_key: TENOR_CLIENT_KEY,
    limit: String(limit),
    media_filter: "gif,tinygif,nanogif",
  });
  if (query) {
    tenorParams.set("q", query);
  }

  let tenorUpstream;
  try {
    tenorUpstream = await fetch(`${TENOR_API_BASE}/${tenorEndpoint}?${tenorParams.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    sendJson(res, 502, {
      error: "Could not reach GIF upstream.",
      message: error instanceof Error ? error.message : "Unknown upstream error.",
    });
    return;
  }

  const tenorData = await tenorUpstream.json().catch(() => ({}));
  if (!tenorUpstream.ok) {
    sendJson(res, tenorUpstream.status || 502, {
      error: "GIF service unavailable.",
      message: getUnknownMessage(tenorData) || "GIF provider returned an error.",
    });
    return;
  }

  const results = Array.isArray(tenorData.results) ? tenorData.results : [];
  const normalized = results
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const formats = entry.media_formats && typeof entry.media_formats === "object" ? entry.media_formats : {};
      const original = formats.gif && typeof formats.gif === "object" ? formats.gif : null;
      const tiny = formats.tinygif && typeof formats.tinygif === "object" ? formats.tinygif : null;
      const nano = formats.nanogif && typeof formats.nanogif === "object" ? formats.nanogif : null;
      const originalUrl = typeof original?.url === "string" ? original.url : "";
      const tinyUrl = typeof tiny?.url === "string" ? tiny.url : "";
      const nanoUrl = typeof nano?.url === "string" ? nano.url : "";
      const previewUrl = tinyUrl || nanoUrl || originalUrl;
      if (!originalUrl && !previewUrl) return null;

      const dims = Array.isArray(original?.dims) ? original.dims : [];
      const tinyDims = Array.isArray(tiny?.dims) ? tiny.dims : dims;
      const nanoDims = Array.isArray(nano?.dims) ? nano.dims : tinyDims;
      const width = Number.isFinite(Number(dims[0])) ? Number(dims[0]) : Number(tinyDims[0]) || Number(nanoDims[0]) || 0;
      const height = Number.isFinite(Number(dims[1])) ? Number(dims[1]) : Number(tinyDims[1]) || Number(nanoDims[1]) || 0;
      const id = typeof entry.id === "string" && entry.id ? entry.id : previewUrl;
      const title =
        typeof entry.content_description === "string" && entry.content_description.trim()
          ? entry.content_description.trim()
          : "GIF";

      return {
        id,
        title,
        images: {
          original: {
            url: originalUrl || previewUrl,
            width: String(width || 0),
            height: String(height || 0),
          },
          fixed_width: {
            url: previewUrl,
            width: String(width || 0),
            height: String(height || 0),
          },
          fixed_width_small: {
            url: previewUrl,
            width: String(width || 0),
            height: String(height || 0),
          },
        },
      };
    })
    .filter(Boolean);

  sendJson(res, 200, {
    data: normalized,
    pagination: {
      offset: 0,
      count: normalized.length,
      total_count: normalized.length,
    },
  });
}

function normalizeInstallerPlatform(rawPlatform) {
  const value = (rawPlatform || "").trim().toLowerCase().replace(/\/+$/, "");
  if (!value) return null;
  if (value === "mac" || value === "macos" || value === "darwin" || value === "osx") return "mac";
  if (value === "windows" || value === "win" || value === "win32") return "windows";
  if (value === "linux") return "linux";
  return null;
}

function makeAttachmentHeader(fileName) {
  const quoted = fileName.replace(/"/g, "");
  return `attachment; filename="${quoted}"`;
}

function resolveInstallerPath(fileName) {
  return path.join(DOWNLOADS_DIR, fileName);
}

function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const result = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stats = fs.statSync(entryPath);
      result.push({
        path: entryPath,
        relativePath: path.relative(RELEASE_DIR, entryPath).replace(/\\/g, "/"),
        name: entry.name,
        mtimeMs: stats.mtimeMs,
        sizeBytes: stats.size,
      });
    }
  }

  return result;
}

function findNewestReleaseInstaller(matchReleaseArtifact) {
  const releaseFiles = listFilesRecursive(RELEASE_DIR);
  const matches = releaseFiles.filter((file) => matchReleaseArtifact(file));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path || null;
}

function resolveInstallerSource(descriptor) {
  const downloadsPath = resolveInstallerPath(descriptor.fileName);
  if (fs.existsSync(downloadsPath) && fs.statSync(downloadsPath).isFile()) {
    const downloadStats = fs.statSync(downloadsPath);
    if (!descriptor.minBytes || downloadStats.size >= descriptor.minBytes) {
      return {
        filePath: downloadsPath,
        source: "public/downloads",
      };
    }
  }

  const releasePath = findNewestReleaseInstaller(descriptor.matchesReleaseArtifact);
  if (releasePath && fs.existsSync(releasePath) && fs.statSync(releasePath).isFile()) {
    const releaseStats = fs.statSync(releasePath);
    if (!descriptor.minBytes || releaseStats.size >= descriptor.minBytes) {
      return {
        filePath: releasePath,
        source: "release",
      };
    }
  }

  return null;
}

let cachedPackageVersion = null;

function readPackageVersion() {
  if (cachedPackageVersion) return cachedPackageVersion;

  try {
    const packageJsonRaw = fs.readFileSync(PACKAGE_JSON_PATH, "utf8");
    const packageJson = JSON.parse(packageJsonRaw);
    if (packageJson && typeof packageJson.version === "string" && packageJson.version.trim()) {
      cachedPackageVersion = packageJson.version.trim();
      return cachedPackageVersion;
    }
  } catch {
    // Fall through to safe default.
  }

  cachedPackageVersion = "0.0.0";
  return cachedPackageVersion;
}

function inferVersionFromInstallerArtifact(filePath, fallbackVersion) {
  const fileName = path.basename(filePath);
  const match = fileName.match(/glytch-chat-([0-9A-Za-z.+-]+)-(?:mac|darwin|osx|win|linux)/i);
  if (!match || !match[1]) return fallbackVersion;
  return match[1];
}

function readInstallerUpdatesManifest() {
  if (!fs.existsSync(DOWNLOADS_UPDATES_MANIFEST_PATH)) return null;

  try {
    const raw = fs.readFileSync(DOWNLOADS_UPDATES_MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function detectRequestOrigin(req) {
  const forwardedProtoHeader = req.headers["x-forwarded-proto"];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader;
  const proto = forwardedProto && typeof forwardedProto === "string"
    ? forwardedProto.split(",")[0].trim()
    : "http";

  const forwardedHostHeader = req.headers["x-forwarded-host"];
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader;
  const host = (typeof forwardedHost === "string" && forwardedHost) || req.headers.host;
  if (!host || typeof host !== "string") return null;

  return `${proto}://${host}`;
}

function absoluteUrlForPath(req, routePath) {
  const origin = detectRequestOrigin(req);
  if (!origin) return routePath;
  return `${origin}${routePath}`;
}

function resolveManifestVersionForPlatform(platform, fallbackVersion) {
  const updatesManifest = readInstallerUpdatesManifest();
  if (!updatesManifest || typeof updatesManifest !== "object") return fallbackVersion;

  const maybePlatforms = updatesManifest.platforms;
  if (!maybePlatforms || typeof maybePlatforms !== "object") return fallbackVersion;

  const platformEntry = maybePlatforms[platform];
  if (!platformEntry || typeof platformEntry !== "object") return fallbackVersion;

  if (typeof platformEntry.version === "string" && platformEntry.version.trim()) {
    return platformEntry.version.trim();
  }

  return fallbackVersion;
}

function expectedInstallerSizeHint(descriptor) {
  if (!descriptor.minBytes) return null;
  return `${Math.round(descriptor.minBytes / (1024 * 1024))}MB`;
}

function installerMissingPayloadHint(platform) {
  if (platform !== "windows") return null;
  return "Windows installer must be a full setup .exe (not a tiny bootstrap).";
}

function handleInstallerNotFound(res, platform, descriptor) {
  const expectedMinSize = expectedInstallerSizeHint(descriptor);
  const hint = installerMissingPayloadHint(platform);

  sendJson(res, 404, {
    error: "Installer is not available yet.",
    platform,
    expectedFile: `public/downloads/${descriptor.fileName}`,
    fallbackScanDir: "release/",
    buildCommand: descriptor.buildCommand,
    ...(expectedMinSize ? { expectedMinSize } : {}),
    ...(hint ? { hint } : {}),
  });
}

function streamInstaller(res, req, filePath, descriptor) {
  const stats = fs.statSync(filePath);
  res.statusCode = 200;
  res.setHeader("Content-Type", descriptor.contentType);
  res.setHeader("Content-Length", String(stats.size));
  res.setHeader("Content-Disposition", makeAttachmentHeader(descriptor.fileName));
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on("error", (error) => {
    sendJson(res, 500, {
      error: "Failed to stream installer file.",
      message: error instanceof Error ? error.message : "Unknown file streaming error.",
    });
  });
  stream.pipe(res);
}

function handleInstallerDownload(req, res, pathname) {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const platformSuffix = pathname.slice(DOWNLOADS_PREFIX.length);
  const platform = normalizeInstallerPlatform(platformSuffix);
  if (!platform) {
    sendJson(res, 404, {
      error: "Unknown installer platform.",
      supported: ["mac", "windows", "linux"],
    });
    return;
  }

  const descriptor = INSTALLER_FILE_MAP[platform];
  const resolved = resolveInstallerSource(descriptor);
  if (!resolved) {
    handleInstallerNotFound(res, platform, descriptor);
    return;
  }

  streamInstaller(res, req, resolved.filePath, descriptor);
}

function handleInstallerUpdateCheck(req, res, pathname) {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const updateSuffix = pathname.slice(UPDATES_PREFIX.length);
  const routeParts = updateSuffix
    .split("/")
    .filter(Boolean);

  if (routeParts.length !== 2 || routeParts[1] !== "latest") {
    sendJson(res, 404, {
      error: "Unknown update route.",
      expected: "/api/updates/{platform}/latest",
      supported: ["mac", "windows", "linux"],
    });
    return;
  }

  const platform = normalizeInstallerPlatform(routeParts[0]);
  if (!platform) {
    sendJson(res, 404, {
      error: "Unknown update platform.",
      supported: ["mac", "windows", "linux"],
    });
    return;
  }

  const descriptor = INSTALLER_FILE_MAP[platform];
  const resolved = resolveInstallerSource(descriptor);
  if (!resolved) {
    handleInstallerNotFound(res, platform, descriptor);
    return;
  }

  const stats = fs.statSync(resolved.filePath);
  const packageVersion = readPackageVersion();
  const inferredVersion = inferVersionFromInstallerArtifact(resolved.filePath, packageVersion);
  const latestVersion = resolveManifestVersionForPlatform(platform, inferredVersion);
  const downloadPath = `${DOWNLOADS_PREFIX}${platform}`;
  const downloadUrl = absoluteUrlForPath(req, downloadPath);
  const updatesManifest = readInstallerUpdatesManifest();
  const manifestPlatform = updatesManifest?.platforms?.[platform];

  const payload = {
    platform,
    version: latestVersion,
    downloadPath,
    downloadUrl,
    fileName: descriptor.fileName,
    sizeBytes: stats.size,
    source: resolved.source,
    publishedAt:
      typeof manifestPlatform?.updatedAt === "string" && manifestPlatform.updatedAt
        ? manifestPlatform.updatedAt
        : new Date(stats.mtimeMs).toISOString(),
    sha256:
      typeof manifestPlatform?.sha256 === "string" && manifestPlatform.sha256
        ? manifestPlatform.sha256
        : null,
  };

  res.setHeader("Cache-Control", "no-store");
  if (method === "HEAD") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end();
    return;
  }

  sendJson(res, 200, payload);
}

const server = createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || "/", "http://localhost");
  const { pathname, search } = parsedUrl;

  if (pathname === "/api/health") {
    const gifServiceAvailable = Boolean(GIPHY_API_KEY || TENOR_API_KEY);
    sendJson(res, 200, {
      ok: true,
      service: "glytch-backend",
      supabaseConfigured: Boolean(SUPABASE_URL),
      giphyConfigured: Boolean(GIPHY_API_KEY),
      tenorConfigured: Boolean(TENOR_API_KEY),
      gifServiceAvailable,
    });
    return;
  }

  if (pathname === "/api/gifs/search") {
    await handleGifSearch(res, parsedUrl);
    return;
  }

  if (pathname.startsWith(UPDATES_PREFIX)) {
    handleInstallerUpdateCheck(req, res, pathname);
    return;
  }

  if (pathname.startsWith(DOWNLOADS_PREFIX)) {
    handleInstallerDownload(req, res, pathname);
    return;
  }

  if (pathname === MEDIA_MESSAGE_INGEST_PATH) {
    await ingestRemoteMessageMedia(req, res, parsedUrl);
    return;
  }

  if (pathname.startsWith(MEDIA_PROFILE_UPLOAD_PREFIX)) {
    await uploadModeratedProfileMedia(req, res, parsedUrl, pathname);
    return;
  }

  if (pathname.startsWith(MEDIA_GLYTCH_ICON_UPLOAD_PREFIX)) {
    await uploadModeratedGlytchIcon(req, res, parsedUrl, pathname);
    return;
  }

  if (pathname.startsWith(MEDIA_MESSAGE_UPLOAD_PREFIX)) {
    await uploadModeratedMessageMedia(req, res, parsedUrl, pathname);
    return;
  }

  if (pathname.startsWith(AUTH_PREFIX)) {
    const suffix = pathname.slice(AUTH_PREFIX.length);
    if (!suffix) {
      sendJson(res, 400, { error: "Missing auth route." });
      return;
    }
    await forwardSupabase(req, res, `/auth/v1/${suffix}${search}`);
    return;
  }

  if (pathname.startsWith(RPC_PREFIX)) {
    const suffix = pathname.slice(RPC_PREFIX.length);
    if (!suffix) {
      sendJson(res, 400, { error: "Missing RPC route." });
      return;
    }
    await forwardSupabase(req, res, `/rest/v1/rpc/${suffix}${search}`);
    return;
  }

  if (pathname.startsWith(REST_PREFIX)) {
    const suffix = pathname.slice(REST_PREFIX.length);
    if (!suffix) {
      sendJson(res, 400, { error: "Missing REST route." });
      return;
    }
    await forwardSupabase(req, res, `/rest/v1/${suffix}${search}`);
    return;
  }

  if (pathname.startsWith(STORAGE_OBJECT_PREFIX)) {
    const suffix = pathname.slice(STORAGE_OBJECT_PREFIX.length);
    if (!suffix) {
      sendJson(res, 400, { error: "Missing storage object path." });
      return;
    }
    await forwardSupabase(req, res, `/storage/v1/object/${suffix}${search}`);
    return;
  }

  if (pathname.startsWith(STORAGE_SIGN_PREFIX)) {
    const suffix = pathname.slice(STORAGE_SIGN_PREFIX.length);
    if (!suffix) {
      sendJson(res, 400, { error: "Missing storage sign path." });
      return;
    }
    await forwardSupabase(req, res, `/storage/v1/object/sign/${suffix}${search}`);
    return;
  }

  sendJson(res, 404, {
    error: "Not found.",
  });
});

server.on("error", (error) => {
  console.error(`[backend] ${error.message}`);
  process.exit(1);
});

server.listen(API_PORT, API_HOST, () => {
  console.log(`[backend] listening on http://${API_HOST}:${API_PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
