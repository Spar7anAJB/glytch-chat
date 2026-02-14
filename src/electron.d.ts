export {};

type ElectronBridgeApi = {
  platform: string;
  isElectron: boolean;
  listDesktopSources?: () => Promise<Array<{ id: string; name: string; kind: "screen" | "window" }>>;
  getDesktopSourceId?: (preferredSourceId?: string | null) => Promise<string | null>;
};

declare global {
  interface Window {
    electronAPI?: ElectronBridgeApi;
  }
}
