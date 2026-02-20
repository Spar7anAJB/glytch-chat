export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return /^[a-z0-9]{3,24}$/.test(username);
}

export function fallbackUsername(email: string, userId: string) {
  const base = email.split("@")[0].replace(/\s+/g, "").toLowerCase() || "user";
  const safeBase = (base.replace(/[^a-z0-9]/g, "") || "user").slice(0, 24);
  const paddedBase = safeBase.length >= 3 ? safeBase : `${safeBase}${"0".repeat(3 - safeBase.length)}`;
  const suffix = userId.replace(/-/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6).padEnd(6, "0");
  return `${paddedBase}#${suffix}`;
}

export function randomUsernameId(length = 6) {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += charset[Math.floor(Math.random() * charset.length)] || "0";
  }
  return output;
}

export function composeUsername(baseName: string, suffix: string) {
  const normalizedBase = normalizeUsername(baseName).replace(/[^a-z0-9]/g, "");
  const safeBase = (normalizedBase || "user").slice(0, 24);
  const paddedBase = safeBase.length >= 3 ? safeBase : `${safeBase}${"0".repeat(3 - safeBase.length)}`;
  const normalizedSuffix = normalizeUsername(suffix).replace(/[^a-z0-9]/g, "").slice(0, 6).padEnd(6, "0");
  return `${paddedBase}#${normalizedSuffix}`;
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
