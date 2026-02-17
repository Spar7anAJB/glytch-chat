function toPublicAssetUrl(assetPath: string): string {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = assetPath.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
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

export const logoAssetUrl = toPublicAssetUrl("logo.png");

const genericInstallerUrl = (import.meta.env.VITE_ELECTRON_INSTALLER_URL as string | undefined)?.trim();
const macInstallerUrl = (import.meta.env.VITE_ELECTRON_INSTALLER_URL_MAC as string | undefined)?.trim();
const windowsInstallerUrl = (import.meta.env.VITE_ELECTRON_INSTALLER_URL_WIN as string | undefined)?.trim();
const linuxInstallerUrl = (import.meta.env.VITE_ELECTRON_INSTALLER_URL_LINUX as string | undefined)?.trim();
const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "");
const backendDownloadsBase = apiBase ? `${apiBase}/api/downloads` : "/api/downloads";

export const desktopInstallerUrls = {
  mac: macInstallerUrl || genericInstallerUrl || `${backendDownloadsBase}/mac`,
  windows: windowsInstallerUrl || genericInstallerUrl || `${backendDownloadsBase}/windows`,
  linux: linuxInstallerUrl || genericInstallerUrl || `${backendDownloadsBase}/linux`,
};

export const recommendedDesktopInstallerUrl = desktopInstallerUrls[resolvePlatformKey()];
