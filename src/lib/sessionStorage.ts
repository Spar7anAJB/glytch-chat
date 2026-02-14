import { parseJwtExpiry } from "./auth";
import type { SessionUser, SessionUserPersisted } from "../types/session";

export const SESSION_KEY = "glytch_supabase_session";

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

export function saveSession(session: SessionUser) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(SESSION_KEY);
}

export function clearSessionStorage() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function loadSession(): SessionUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!hasSessionShape(parsed)) return null;
    return withSessionExpiry(parsed);
  } catch {
    return null;
  }
}
