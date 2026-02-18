export function normalizeBackendApiBaseUrl(rawValue: string | undefined): string {
  if (!rawValue) return "";

  const trimmed = rawValue.trim().replace(/\/+$/, "");
  if (!trimmed) return "";

  return trimmed.replace(/\/api$/i, "");
}
