import { contextBridge, ipcRenderer } from "electron";

const DESKTOP_UPDATER_EVENT_CHANNEL = "electron:updater-event";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,
  listDesktopSources: () => ipcRenderer.invoke("electron:list-desktop-sources"),
  getDesktopSourceId: (preferredSourceId) => ipcRenderer.invoke("electron:get-desktop-source-id", preferredSourceId),
  getAppVersion: () => ipcRenderer.invoke("electron:get-app-version"),
  getDesktopUpdaterState: () => ipcRenderer.invoke("electron:updater-get-state"),
  checkForDesktopUpdates: (backendBaseUrl) => ipcRenderer.invoke("electron:updater-check-for-updates", backendBaseUrl),
  installDownloadedUpdate: () => ipcRenderer.invoke("electron:updater-quit-and-install"),
  onDesktopUpdaterEvent: (listener) => {
    if (typeof listener !== "function") {
      return () => {};
    }
    const wrapped = (_event, payload) => {
      listener(payload);
    };
    ipcRenderer.on(DESKTOP_UPDATER_EVENT_CHANNEL, wrapped);
    return () => {
      ipcRenderer.removeListener(DESKTOP_UPDATER_EVENT_CHANNEL, wrapped);
    };
  },
  openUninstall: () => ipcRenderer.invoke("electron:open-uninstall"),
  getMediaPermissionStatus: (kind) => ipcRenderer.invoke("electron:get-media-permission-status", kind),
  openWindowsPrivacySettings: (kind) => ipcRenderer.invoke("electron:open-windows-privacy-settings", kind),
  detectActiveGame: () => ipcRenderer.invoke("electron:detect-active-game"),
});
