import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));
}

loadWorkspaceEnv();

const API_PORT = Number.parseInt(process.env.API_PORT ?? "8787", 10);
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const GIPHY_API_BASE = (process.env.GIPHY_API_BASE || process.env.VITE_GIPHY_API_BASE || "https://api.giphy.com/v1/gifs").replace(
  /\/+$/,
  "",
);
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || process.env.VITE_GIPHY_API_KEY || "";
const GIPHY_RATING = process.env.GIPHY_RATING || process.env.VITE_GIPHY_RATING || "pg";

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
  if (!GIPHY_API_KEY) {
    sendJson(res, 503, {
      error: "GIF service unavailable.",
      message: "Set GIPHY_API_KEY (or VITE_GIPHY_API_KEY) on the backend.",
    });
    return;
  }

  const query = parsedUrl.searchParams.get("q")?.trim() || "";
  const rawLimit = Number.parseInt(parsedUrl.searchParams.get("limit") || "24", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 24;
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

  await relayFetchResponse(res, upstream);
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
    sendJson(res, 200, {
      ok: true,
      service: "glytch-backend",
      supabaseConfigured: Boolean(SUPABASE_URL),
      giphyConfigured: Boolean(GIPHY_API_KEY),
    });
    return;
  }

  if (pathname === "/api/gifs/search") {
    await handleGifSearch(res, parsedUrl);
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

server.listen(API_PORT, "127.0.0.1", () => {
  console.log(`[backend] listening on http://127.0.0.1:${API_PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
