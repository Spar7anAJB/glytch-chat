export {};

type DesktopUpdaterStatus = "idle" | "checking" | "downloading" | "downloaded" | "error";
type DesktopUpdaterPlatform = "windows" | "mac" | null;

type DesktopUpdaterState = {
  supported: boolean;
  platform: DesktopUpdaterPlatform;
  status: DesktopUpdaterStatus;
  currentVersion: string;
  latestVersion: string;
  downloadedVersion: string;
  releaseDate: string | null;
  progressPercent: number | null;
  bytesPerSecond: number | null;
  transferred: number | null;
  total: number | null;
  feedUrl: string;
  lastCheckedAt: string | null;
  error: string;
};

type DesktopUpdaterEventPayload = {
  event: string;
  at: string;
  message?: string;
  version?: string;
  releaseDate?: string | null;
  progress?: {
    percent: number | null;
    bytesPerSecond: number | null;
    transferred: number | null;
    total: number | null;
  };
  state?: DesktopUpdaterState;
};

type ElectronBridgeApi = {
  platform: string;
  isElectron: boolean;
  listDesktopSources?: () => Promise<Array<{ id: string; name: string; kind: "screen" | "window" }>>;
  getDesktopSourceId?: (preferredSourceId?: string | null) => Promise<string | null>;
  getAppVersion?: () => Promise<string>;
  getDesktopUpdaterState?: () => Promise<DesktopUpdaterState>;
  checkForDesktopUpdates?: (
    backendBaseUrl: string,
  ) => Promise<{ ok: boolean; started: boolean; error?: string; state?: DesktopUpdaterState }>;
  installDownloadedUpdate?: () => Promise<{ ok: boolean }>;
  onDesktopUpdaterEvent?: (listener: (event: DesktopUpdaterEventPayload) => void) => () => void;
  openUninstall?: () => Promise<{ ok: boolean; launched?: boolean }>;
  getMediaPermissionStatus?: (
    kind: "camera" | "microphone",
  ) => Promise<{ ok: boolean; status: string; error?: string }>;
  openWindowsPrivacySettings?: (kind: "camera" | "microphone" | "screen" | "privacy") => Promise<{ ok: boolean }>;
  detectActiveGame?: () => Promise<{ ok: boolean; gameName: string | null; error?: string }>;
};

declare global {
  interface Window {
    electronAPI?: ElectronBridgeApi;
  }
}
