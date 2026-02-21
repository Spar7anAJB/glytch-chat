import { app, BrowserWindow, desktopCapturer, ipcMain, nativeImage, session, shell, systemPreferences } from "electron";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { autoUpdater } from "electron-updater";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devServerUrl = process.env.ELECTRON_DEV_SERVER_URL;
const isDev = Boolean(devServerUrl);
const shouldOpenDevTools = isDev && process.env.ELECTRON_OPEN_DEVTOOLS === "1";
const appName = "Glytch Chat";
const initialHashRoute = "/auth";
const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";
const DESKTOP_UPDATER_EVENT_CHANNEL = "electron:updater-event";
const desktopUpdaterPlatform = isWindows ? "windows" : isMac ? "mac" : null;
const supportsDesktopUpdater = !isDev && Boolean(desktopUpdaterPlatform);
let desktopUpdaterListenersAttached = false;
let desktopUpdaterCheckInFlight = false;
let desktopUpdaterFeedUrl = "";
const desktopUpdaterState = {
  supported: supportsDesktopUpdater,
  platform: desktopUpdaterPlatform,
  status: "idle",
  currentVersion: "0.0.0",
  latestVersion: "",
  downloadedVersion: "",
  releaseDate: null,
  progressPercent: null,
  bytesPerSecond: null,
  transferred: null,
  total: null,
  feedUrl: "",
  lastCheckedAt: null,
  error: "",
};
const logoPathCandidates = isDev
  ? [
      path.join(__dirname, "..", "public", "logo-v2.png"),
      path.join(__dirname, "..", "dist", "logo-v2.png"),
      path.join(__dirname, "..", "public", "logo.png"),
      path.join(__dirname, "..", "dist", "logo.png"),
    ]
  : [
      path.join(__dirname, "..", "dist", "logo-v2.png"),
      path.join(__dirname, "..", "public", "logo-v2.png"),
      path.join(__dirname, "..", "dist", "logo.png"),
      path.join(__dirname, "..", "public", "logo.png"),
    ];
const logoPath = logoPathCandidates.find((candidate) => fs.existsSync(candidate));
const KNOWN_GAME_PROCESS_NAMES = new Map([
  ["minecraft", "Minecraft"],
  ["minecraftlauncher", "Minecraft"],
  ["cs2", "Counter-Strike 2"],
  ["csgo", "Counter-Strike"],
  ["dota2", "Dota 2"],
  ["valorant-win64-shipping", "VALORANT"],
  ["fortniteclient-win64-shipping", "Fortnite"],
  ["r5apex", "Apex Legends"],
  ["rocketleague", "Rocket League"],
  ["leagueclient", "League of Legends"],
  ["leagueclientux", "League of Legends"],
  ["overwatch", "Overwatch 2"],
  ["overwatchlauncher", "Overwatch 2"],
  ["gta5", "Grand Theft Auto V"],
  ["eldenring", "Elden Ring"],
  ["palworld-win64-shipping", "Palworld"],
  ["helldivers2", "Helldivers 2"],
  ["stardewvalley", "Stardew Valley"],
  ["terraria", "Terraria"],
  ["robloxplayerbeta", "Roblox"],
  ["osu", "osu!"],
]);
const PROCESS_NAME_BLOCKLIST = new Set([
  "system",
  "idle",
  "windowserver",
  "explorer",
  "finder",
  "taskhostw",
  "svchost",
  "runtimebroker",
  "searchhost",
  "code",
  "electron",
  "glytch chat",
  "glytch-chat",
  "chrome",
  "chromium",
  "firefox",
  "safari",
  "discord",
  "steam",
  "steamwebhelper",
  "obs64",
  "obs",
  "terminal",
  "zsh",
  "bash",
  "fish",
  "node",
  "nodejs",
]);

function normalizeProcessName(rawName) {
  const trimmed = typeof rawName === "string" ? rawName.trim() : "";
  if (!trimmed) return "";
  const baseName = path.basename(trimmed).replace(/\.[^.]+$/, "");
  return baseName.trim().toLowerCase();
}

function humanizeProcessName(processName) {
  const cleaned = processName
    .replace(/[-_.]+/g, " ")
    .replace(/\b(x64|x86|win64|win32|shipping|launcher|client|game|retail|dx11|dx12)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  const words = cleaned.split(" ").filter(Boolean);
  if (words.length === 0) return null;
  return words
    .map((word) => {
      if (word.length <= 3) return word.toUpperCase();
      return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function runCommandCapture(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true, maxBuffer: 6 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(String(stdout || ""));
    });
  });
}

function parseTasklistProcessName(line) {
  const trimmed = line.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith('"')) {
    const secondQuoteIndex = trimmed.indexOf('"', 1);
    if (secondQuoteIndex > 1) {
      return trimmed.slice(1, secondQuoteIndex);
    }
  }
  return trimmed.split(",")[0] || "";
}

async function listRunningProcessNames() {
  if (isWindows) {
    const stdout = await runCommandCapture("tasklist", ["/fo", "csv", "/nh"]);
    return stdout
      .split(/\r?\n/)
      .map((line) => normalizeProcessName(parseTasklistProcessName(line)))
      .filter(Boolean);
  }

  const stdout = await runCommandCapture("ps", ["-A", "-o", "comm="]);
  return stdout
    .split(/\r?\n/)
    .map((line) => normalizeProcessName(line))
    .filter(Boolean);
}

function inferActiveGameName(processNames) {
  for (const processName of processNames) {
    if (!processName || PROCESS_NAME_BLOCKLIST.has(processName)) continue;
    const directMatch = KNOWN_GAME_PROCESS_NAMES.get(processName);
    if (directMatch) return directMatch;

    if (processName.includes("minecraft")) return "Minecraft";
    if (processName.includes("valorant")) return "VALORANT";
    if (processName.includes("fortnite")) return "Fortnite";
    if (processName.includes("leagueclient")) return "League of Legends";
    if (processName.includes("rocketleague")) return "Rocket League";
    if (processName.includes("apex")) return "Apex Legends";
    if (processName.includes("overwatch")) return "Overwatch 2";
    if (processName.includes("eldenring")) return "Elden Ring";
    if (processName.includes("palworld")) return "Palworld";
    if (processName.includes("helldivers")) return "Helldivers 2";
    if (processName.includes("gta5")) return "Grand Theft Auto V";
    if (processName.includes("dota2")) return "Dota 2";
    if (processName === "cs2" || processName === "csgo") return "Counter-Strike";
    if (processName.includes("stardew")) return "Stardew Valley";
    if (processName.includes("terraria")) return "Terraria";
    if (processName.includes("roblox")) return "Roblox";
    if (processName === "osu" || processName.includes("osu")) return "osu!";
  }
  for (const processName of processNames) {
    if (!processName || PROCESS_NAME_BLOCKLIST.has(processName)) continue;
    if (processName.includes("helper") || processName.includes("service") || processName.includes("updater")) {
      continue;
    }
    const readable = humanizeProcessName(processName);
    if (readable && readable.length >= 3) {
      return readable;
    }
  }
  return null;
}

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

function readVersionFromManifest(manifestPath) {
  try {
    if (!fs.existsSync(manifestPath)) return "";
    const raw = fs.readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return "";
    if (typeof parsed.version !== "string") return "";
    const normalized = parsed.version.trim();
    if (!normalized || normalized === "0.0.0") return "";
    return normalized;
  } catch {
    return "";
  }
}

function resolvePackagedAppVersionFallback() {
  const candidates = [
    path.join(process.resourcesPath, "app.asar", "package.json"),
    path.join(process.resourcesPath, "app", "package.json"),
    path.join(__dirname, "..", "package.json"),
  ];

  for (const candidate of candidates) {
    const resolved = readVersionFromManifest(candidate);
    if (resolved) return resolved;
  }
  return "";
}

function resolveDesktopAppVersion() {
  const runtimeVersion = (app.getVersion() || "").trim();
  if (runtimeVersion && runtimeVersion !== "0.0.0") {
    return runtimeVersion;
  }
  const fallbackVersion = resolvePackagedAppVersionFallback();
  if (fallbackVersion) return fallbackVersion;
  return runtimeVersion || "0.0.0";
}

ipcMain.handle("electron:get-app-version", async () => resolveDesktopAppVersion());

function normalizeBackendBaseUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveDesktopUpdaterFeedUrl(rawBackendBaseUrl) {
  if (!desktopUpdaterPlatform) return null;
  const normalizedBase = normalizeBackendBaseUrl(rawBackendBaseUrl);
  if (!normalizedBase) return null;
  return `${normalizedBase}/api/desktop-updates/${desktopUpdaterPlatform}`;
}

function cloneDesktopUpdaterState() {
  return { ...desktopUpdaterState };
}

function updateDesktopUpdaterState(partial) {
  Object.assign(desktopUpdaterState, partial);
  return cloneDesktopUpdaterState();
}

function broadcastDesktopUpdaterEvent(event, payload = {}) {
  const message = {
    event,
    at: new Date().toISOString(),
    ...payload,
  };

  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue;
    window.webContents.send(DESKTOP_UPDATER_EVENT_CHANNEL, message);
  }
}

function normalizeReleaseDate(rawValue) {
  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function setupDesktopUpdaterListeners() {
  if (!supportsDesktopUpdater || desktopUpdaterListenersAttached) return;
  desktopUpdaterListenersAttached = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on("checking-for-update", () => {
    desktopUpdaterCheckInFlight = true;
    const state = updateDesktopUpdaterState({
      status: "checking",
      error: "",
      progressPercent: null,
      bytesPerSecond: null,
      transferred: null,
      total: null,
    });
    broadcastDesktopUpdaterEvent("checking-for-update", { state });
  });

  autoUpdater.on("update-available", (info) => {
    const state = updateDesktopUpdaterState({
      status: "downloading",
      latestVersion: typeof info?.version === "string" ? info.version.trim() : desktopUpdaterState.latestVersion,
      downloadedVersion: "",
      releaseDate: normalizeReleaseDate(info?.releaseDate),
      error: "",
    });
    broadcastDesktopUpdaterEvent("update-available", { version: state.latestVersion, releaseDate: state.releaseDate, state });
  });

  autoUpdater.on("update-not-available", (info) => {
    desktopUpdaterCheckInFlight = false;
    const resolvedLatestVersion =
      typeof info?.version === "string" && info.version.trim()
        ? info.version.trim()
        : desktopUpdaterState.currentVersion;
    const state = updateDesktopUpdaterState({
      status: "idle",
      latestVersion: resolvedLatestVersion,
      downloadedVersion: "",
      releaseDate: normalizeReleaseDate(info?.releaseDate),
      progressPercent: null,
      bytesPerSecond: null,
      transferred: null,
      total: null,
      lastCheckedAt: new Date().toISOString(),
      error: "",
    });
    broadcastDesktopUpdaterEvent("update-not-available", { version: state.latestVersion, state });
  });

  autoUpdater.on("download-progress", (progress) => {
    const state = updateDesktopUpdaterState({
      status: "downloading",
      progressPercent: Number.isFinite(progress?.percent) ? Math.max(0, Math.min(100, progress.percent)) : null,
      bytesPerSecond: Number.isFinite(progress?.bytesPerSecond) ? Math.max(0, progress.bytesPerSecond) : null,
      transferred: Number.isFinite(progress?.transferred) ? Math.max(0, progress.transferred) : null,
      total: Number.isFinite(progress?.total) ? Math.max(0, progress.total) : null,
      error: "",
    });
    broadcastDesktopUpdaterEvent("download-progress", {
      progress: {
        percent: state.progressPercent,
        bytesPerSecond: state.bytesPerSecond,
        transferred: state.transferred,
        total: state.total,
      },
      state,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    desktopUpdaterCheckInFlight = false;
    const downloadedVersion =
      typeof info?.version === "string" && info.version.trim()
        ? info.version.trim()
        : desktopUpdaterState.latestVersion || desktopUpdaterState.currentVersion;
    const state = updateDesktopUpdaterState({
      status: "downloaded",
      latestVersion: downloadedVersion,
      downloadedVersion,
      releaseDate: normalizeReleaseDate(info?.releaseDate),
      progressPercent: 100,
      bytesPerSecond: null,
      transferred: null,
      total: null,
      lastCheckedAt: new Date().toISOString(),
      error: "",
    });
    broadcastDesktopUpdaterEvent("update-downloaded", { version: downloadedVersion, state });
  });

  autoUpdater.on("error", (error) => {
    desktopUpdaterCheckInFlight = false;
    const message = error instanceof Error ? error.message : "Desktop updater failed.";
    const state = updateDesktopUpdaterState({
      status: "error",
      lastCheckedAt: new Date().toISOString(),
      error: message,
    });
    broadcastDesktopUpdaterEvent("error", { message, state });
  });
}

function ensureDesktopUpdaterConfigured(rawBackendBaseUrl) {
  if (!supportsDesktopUpdater) {
    throw new Error("Desktop updates are only available in packaged Windows/macOS builds.");
  }

  setupDesktopUpdaterListeners();
  const feedUrl = resolveDesktopUpdaterFeedUrl(rawBackendBaseUrl);
  if (!feedUrl) {
    throw new Error("A valid backend API URL is required to configure desktop updates.");
  }
  if (desktopUpdaterFeedUrl !== feedUrl) {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: feedUrl,
      channel: "latest",
    });
    desktopUpdaterFeedUrl = feedUrl;
    updateDesktopUpdaterState({ feedUrl });
  }
}

updateDesktopUpdaterState({
  currentVersion: resolveDesktopAppVersion(),
});

ipcMain.handle("electron:updater-get-state", async () => cloneDesktopUpdaterState());

ipcMain.handle("electron:updater-check-for-updates", async (_event, rawBackendBaseUrl) => {
  updateDesktopUpdaterState({
    currentVersion: resolveDesktopAppVersion(),
  });

  try {
    ensureDesktopUpdaterConfigured(rawBackendBaseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not configure desktop updater.";
    const state = updateDesktopUpdaterState({
      status: "error",
      error: message,
      lastCheckedAt: new Date().toISOString(),
    });
    return { ok: false, started: false, error: message, state };
  }

  if (desktopUpdaterCheckInFlight) {
    return { ok: true, started: false, state: cloneDesktopUpdaterState() };
  }

  try {
    await autoUpdater.checkForUpdates();
    return { ok: true, started: true, state: cloneDesktopUpdaterState() };
  } catch (error) {
    desktopUpdaterCheckInFlight = false;
    const message = error instanceof Error ? error.message : "Could not check for updates.";
    const state = updateDesktopUpdaterState({
      status: "error",
      error: message,
      lastCheckedAt: new Date().toISOString(),
    });
    broadcastDesktopUpdaterEvent("error", { message, state });
    return { ok: false, started: false, error: message, state };
  }
});

ipcMain.handle("electron:updater-quit-and-install", async () => {
  if (!supportsDesktopUpdater) {
    throw new Error("Desktop update install is not available on this platform.");
  }
  if (desktopUpdaterState.status !== "downloaded") {
    throw new Error("No downloaded update is ready to install.");
  }

  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });
  return { ok: true };
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

ipcMain.handle("electron:get-media-permission-status", async (_event, kind) => {
  const mediaKind = kind === "camera" ? "camera" : kind === "microphone" ? "microphone" : null;
  if (!mediaKind) {
    return { ok: false, status: "unknown", error: "Unknown media permission kind." };
  }

  try {
    if (!systemPreferences || typeof systemPreferences.getMediaAccessStatus !== "function") {
      return { ok: true, status: "unknown" };
    }
    const status = systemPreferences.getMediaAccessStatus(mediaKind);
    return { ok: true, status: typeof status === "string" ? status : "unknown" };
  } catch (error) {
    return {
      ok: false,
      status: "unknown",
      error: error instanceof Error ? error.message : "Could not read media permission status.",
    };
  }
});

ipcMain.handle("electron:open-windows-privacy-settings", async (_event, kind) => {
  if (!isWindows) {
    throw new Error("Windows privacy settings are only available on Windows.");
  }

  const route =
    kind === "camera"
      ? "ms-settings:privacy-webcam"
      : kind === "microphone"
        ? "ms-settings:privacy-microphone"
        : kind === "screen"
          ? "ms-settings:privacy-screencapture"
          : "ms-settings:privacy";
  await shell.openExternal(route);
  return { ok: true };
});

ipcMain.handle("electron:detect-active-game", async () => {
  try {
    const processNames = await listRunningProcessNames();
    const gameName = inferActiveGameName(processNames);
    return { ok: true, gameName };
  } catch (error) {
    return {
      ok: false,
      gameName: null,
      error: error instanceof Error ? error.message : "Could not detect active game.",
    };
  }
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

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === "media" || permission === "display-capture") {
      return true;
    }
    return false;
  });

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
