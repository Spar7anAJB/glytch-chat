export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return /^[a-z0-9_.-]{3,24}$/.test(username);
}

export function fallbackUsername(email: string, userId: string) {
  const base = email.split("@")[0].replace(/\s+/g, "").toLowerCase() || "user";
  const safeBase = base.replace(/[^a-z0-9_.-]/g, "") || "user";
  return `${safeBase}_${userId.replace(/-/g, "").slice(0, 6)}`;
}

export function parseJwtExpiry(accessToken: string): number | null {
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded) as { exp?: unknown };
    if (typeof parsed.exp !== "number") return null;
    return parsed.exp * 1000;
  } catch {
    return null;
  }
}
