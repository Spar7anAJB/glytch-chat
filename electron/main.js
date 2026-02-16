import { app, BrowserWindow, desktopCapturer, ipcMain, nativeImage, session, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devServerUrl = process.env.ELECTRON_DEV_SERVER_URL;
const isDev = Boolean(devServerUrl);
const shouldOpenDevTools = isDev && process.env.ELECTRON_OPEN_DEVTOOLS === "1";
const appName = "Glytch Chat";
const initialHashRoute = "/auth";
const logoPath = isDev
  ? path.join(__dirname, "..", "public", "logo.png")
  : path.join(__dirname, "..", "dist", "logo.png");

app.setName(appName);
if (process.platform === "win32") {
  app.setAppUserModelId("com.glytch.chat");
}

function applyRuntimeAppIcon() {
  if (!fs.existsSync(logoPath)) return;
  const logoImage = nativeImage.createFromPath(logoPath);
  if (logoImage.isEmpty()) return;

  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(logoImage);
  }
}

if (isDev) {
  app.commandLine.appendSwitch("allow-http-screen-capture");
}
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");

async function getDesktopCaptureSources() {
  return desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 0, height: 0 },
    fetchWindowIcons: false,
  });
}

ipcMain.handle("electron:list-desktop-sources", async () => {
  const sources = await getDesktopCaptureSources();
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    kind: source.id.startsWith("screen:") ? "screen" : "window",
  }));
});

ipcMain.handle("electron:get-desktop-source-id", async (_event, preferredSourceId = null) => {
  const sources = await getDesktopCaptureSources();
  if (typeof preferredSourceId === "string" && preferredSourceId.length > 0) {
    const matching = sources.find((source) => source.id === preferredSourceId);
    if (matching) return matching.id;
  }

  const preferredSource = sources.find((source) => source.id.startsWith("screen:")) || sources[0];
  return preferredSource?.id || null;
});

function createWindow() {
  const win = new BrowserWindow({
    show: false,
    width: 1360,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    title: appName,
    icon: fs.existsSync(logoPath) ? logoPath : undefined,
    backgroundColor: "#edf2fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      devTools: isDev,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        void shell.openExternal(parsed.toString());
      }
    } catch {
      // Ignore malformed or unsupported URLs.
    }
    return { action: "deny" };
  });

  if (isDev) {
    void win.loadURL(`${devServerUrl}#${initialHashRoute}`);
    if (shouldOpenDevTools) {
      win.webContents.openDevTools({ mode: "detach" });
    }
    return;
  }

  void win.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
    hash: initialHashRoute,
  });
}

app.whenReady().then(() => {
  applyRuntimeAppIcon();

  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      try {
        const sources = await getDesktopCaptureSources();
        const preferredSource = sources.find((source) => source.id.startsWith("screen:")) || sources[0];
        if (!preferredSource) {
          callback({ video: false, audio: false });
          return;
        }
        callback({ video: preferredSource, audio: false });
      } catch {
        callback({ video: false, audio: false });
      }
    },
    { useSystemPicker: true },
  );

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === "media" || permission === "display-capture") {
      callback(true);
      return;
    }
    callback(false);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
