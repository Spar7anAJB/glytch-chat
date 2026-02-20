import { normalizeBackendApiBaseUrl } from "./apiBase";

function toPublicAssetUrl(assetPath: string): string {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = assetPath.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
}

function isLocalHostEnvironment() {
  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function resolvePlatformKey() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("windows")) {
    return "windows";
  }
  if (userAgent.includes("mac os") || userAgent.includes("macintosh")) {
    return "mac";
  }
  return "linux";
}

export const logoAssetUrl = toPublicAssetUrl("logo-v2.png");
export const glytchesIconAssetUrl = toPublicAssetUrl("glytches-icon.png");
export const settingsIconAssetUrl = toPublicAssetUrl("settings-icon.png");

const genericInstallerUrl = (import.meta.env.VITE_ELECTRON_INSTALLER_URL as string | undefined)?.trim();
const macInstallerUrl = (import.meta.env.VITE_ELECTRON_INSTALLER_URL_MAC as string | undefined)?.trim();
const windowsInstallerUrl = (import.meta.env.VITE_ELECTRON_INSTALLER_URL_WIN as string | undefined)?.trim();
const linuxInstallerUrl = (import.meta.env.VITE_ELECTRON_INSTALLER_URL_LINUX as string | undefined)?.trim();
const apiBase = normalizeBackendApiBaseUrl(import.meta.env.VITE_API_URL as string | undefined);
const backendDownloadsBase = apiBase ? `${apiBase}/api/downloads` : "/api/downloads";
const canFallbackToBackendDownloads = Boolean(apiBase) || isLocalHostEnvironment();

const fallbackInstallerUrls = canFallbackToBackendDownloads
  ? {
      mac: `${backendDownloadsBase}/mac`,
      windows: `${backendDownloadsBase}/windows`,
      linux: `${backendDownloadsBase}/linux`,
    }
  : {
      mac: "",
      windows: "",
      linux: "",
    };

export const desktopInstallerUrls = {
  mac: macInstallerUrl || genericInstallerUrl || fallbackInstallerUrls.mac,
  windows: windowsInstallerUrl || genericInstallerUrl || fallbackInstallerUrls.windows,
  linux: linuxInstallerUrl || genericInstallerUrl || fallbackInstallerUrls.linux,
};

export const recommendedDesktopInstallerUrl = desktopInstallerUrls[resolvePlatformKey()];
