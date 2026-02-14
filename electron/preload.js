import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,
  listDesktopSources: () => ipcRenderer.invoke("electron:list-desktop-sources"),
  getDesktopSourceId: (preferredSourceId) => ipcRenderer.invoke("electron:get-desktop-source-id", preferredSourceId),
});
