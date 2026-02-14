import { parseJwtExpiry } from "./auth";
import type { SessionUser, SessionUserPersisted } from "../types/session";

export const SESSION_KEY = "glytch_supabase_session";
export type SessionPersistence = "session" | "local";

function readStoredSession(): { raw: string; persistence: SessionPersistence } | null {
  const sessionRaw = sessionStorage.getItem(SESSION_KEY);
  if (sessionRaw) {
    return { raw: sessionRaw, persistence: "session" };
  }

  const localRaw = localStorage.getItem(SESSION_KEY);
  if (localRaw) {
    return { raw: localRaw, persistence: "local" };
  }

  return null;
}

export function withSessionExpiry(session: SessionUserPersisted): SessionUser {
  return {
    ...session,
    expiresAt: typeof session.expiresAt === "number" ? session.expiresAt : parseJwtExpiry(session.accessToken),
  };
}

export function hasSessionShape(value: unknown): value is SessionUserPersisted {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.username === "string" &&
    typeof row.email === "string" &&
    typeof row.accessToken === "string" &&
    typeof row.refreshToken === "string"
  );
}

export function saveSession(session: SessionUser, persistence: SessionPersistence = "session") {
  const serialized = JSON.stringify(session);
  if (persistence === "local") {
    localStorage.setItem(SESSION_KEY, serialized);
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_KEY, serialized);
  localStorage.removeItem(SESSION_KEY);
}

export function clearSessionStorage() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getStoredSessionPersistence(): SessionPersistence | null {
  const stored = readStoredSession();
  if (!stored) return null;
  return stored.persistence;
}

export function loadSession(): SessionUser | null {
  const stored = readStoredSession();
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored.raw) as unknown;
    if (!hasSessionShape(parsed)) return null;
    return withSessionExpiry(parsed);
  } catch {
    return null;
  }
}
