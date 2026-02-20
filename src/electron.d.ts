export {};

type ElectronBridgeApi = {
  platform: string;
  isElectron: boolean;
  listDesktopSources?: () => Promise<Array<{ id: string; name: string; kind: "screen" | "window" }>>;
  getDesktopSourceId?: (preferredSourceId?: string | null) => Promise<string | null>;
  getAppVersion?: () => Promise<string>;
  downloadAndInstallUpdate?: (downloadUrl: string) => Promise<{ ok: boolean }>;
  openUninstall?: () => Promise<{ ok: boolean; launched?: boolean }>;
  getMediaPermissionStatus?: (
    kind: "camera" | "microphone",
  ) => Promise<{ ok: boolean; status: string; error?: string }>;
  openWindowsPrivacySettings?: (kind: "camera" | "microphone" | "screen" | "privacy") => Promise<{ ok: boolean }>;
};

declare global {
  interface Window {
    electronAPI?: ElectronBridgeApi;
  }
}
