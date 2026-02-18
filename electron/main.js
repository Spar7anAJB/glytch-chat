import { app, BrowserWindow, desktopCapturer, ipcMain, nativeImage, session, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devServerUrl = process.env.ELECTRON_DEV_SERVER_URL;
const isDev = Boolean(devServerUrl);
const shouldOpenDevTools = isDev && process.env.ELECTRON_OPEN_DEVTOOLS === "1";
const appName = "Glytch Chat";
const initialHashRoute = "/auth";
const isWindows = process.platform === "win32";
const WINDOWS_UPDATER_MIN_BYTES = 5 * 1024 * 1024;
let installUpdateInFlight = false;
const logoPathCandidates = isDev
  ? [path.join(__dirname, "..", "public", "logo.png"), path.join(__dirname, "..", "dist", "logo.png")]
  : [path.join(__dirname, "..", "dist", "logo.png"), path.join(__dirname, "..", "public", "logo.png")];
const logoPath = logoPathCandidates.find((candidate) => fs.existsSync(candidate));

app.setName(appName);
if (isWindows) {
  app.setAppUserModelId("com.glytch.chat");
}

function applyRuntimeAppIcon() {
  if (!logoPath) return;
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

ipcMain.handle("electron:get-app-version", async () => app.getVersion());

function normalizeUpdateDownloadUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function downloadWindowsInstaller(updateUrl) {
  const response = await fetch(updateUrl, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Update download failed (${response.status}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < WINDOWS_UPDATER_MIN_BYTES) {
    throw new Error("Downloaded update file is too small to be a valid installer.");
  }

  const updatesDir = path.join(os.tmpdir(), "glytch-chat-updates");
  fs.mkdirSync(updatesDir, { recursive: true });

  const fileName = `glytch-chat-update-${Date.now()}.exe`;
  const targetPath = path.join(updatesDir, fileName);
  await fs.promises.writeFile(targetPath, buffer);
  return targetPath;
}

function launchWindowsInstaller(installerPath) {
  const child = spawn(installerPath, [], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

ipcMain.handle("electron:download-and-install-update", async (_event, rawUrl) => {
  if (!isWindows) {
    throw new Error("In-app installer updates are currently only supported on Windows.");
  }
  if (installUpdateInFlight) {
    throw new Error("An update install is already in progress.");
  }

  const normalizedUrl = normalizeUpdateDownloadUrl(rawUrl);
  if (!normalizedUrl) {
    throw new Error("Update URL is missing or invalid.");
  }

  installUpdateInFlight = true;
  try {
    const installerPath = await downloadWindowsInstaller(normalizedUrl);
    launchWindowsInstaller(installerPath);

    // Exit shortly after launching installer so NSIS can replace app files cleanly.
    setTimeout(() => {
      app.quit();
    }, 300);

    return { ok: true };
  } finally {
    installUpdateInFlight = false;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    show: false,
    width: 1360,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    title: appName,
    icon: logoPath,
    autoHideMenuBar: true,
    backgroundColor: "#edf2fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      devTools: isDev,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  if (isWindows) {
    win.setMenuBarVisibility(false);
    win.removeMenu();
    if (logoPath) {
      const logoImage = nativeImage.createFromPath(logoPath);
      if (!logoImage.isEmpty()) {
        win.setIcon(logoImage);
      }
    }
  }

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

ipcMain.handle("electron:open-uninstall", async () => {
  if (!isWindows) {
    throw new Error("Uninstall shortcut is currently supported on Windows only.");
  }

  const exePath = app.getPath("exe");
  const installDir = path.dirname(exePath);
  const candidateNames = [
    `Uninstall ${appName}.exe`,
    "Uninstall Glytch Chat.exe",
    "Uninstall.exe",
  ];

  for (const candidateName of candidateNames) {
    const candidatePath = path.join(installDir, candidateName);
    if (!fs.existsSync(candidatePath)) continue;
    const child = spawn(candidatePath, [], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return { ok: true, launched: true };
  }

  await shell.openExternal("ms-settings:appsfeatures");
  return { ok: true, launched: false };
});

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
