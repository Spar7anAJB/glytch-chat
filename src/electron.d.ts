export {};

type ElectronBridgeApi = {
  platform: string;
  isElectron: boolean;
  listDesktopSources?: () => Promise<Array<{ id: string; name: string; kind: "screen" | "window" }>>;
  getDesktopSourceId?: (preferredSourceId?: string | null) => Promise<string | null>;
  getAppVersion?: () => Promise<string>;
  downloadAndInstallUpdate?: (downloadUrl: string) => Promise<{ ok: boolean }>;
  openUninstall?: () => Promise<{ ok: boolean; launched?: boolean }>;
};

declare global {
  interface Window {
    electronAPI?: ElectronBridgeApi;
  }
}
