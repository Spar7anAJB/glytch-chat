import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const rootDir = process.cwd();
const releaseDir = path.join(rootDir, "release");
const downloadsDir = path.join(rootDir, "public", "downloads");
const updaterDownloadsDir = path.join(downloadsDir, "updater");
const updatesManifestPath = path.join(downloadsDir, "updates.json");
const packageJsonPath = path.join(rootDir, "package.json");

const installers = [
  {
    id: "mac",
    outputName: "glytch-chat-installer.dmg",
    test: (file) => file.name.toLowerCase().endsWith(".dmg"),
  },
  {
    id: "windows",
    outputName: "glytch-chat-setup.exe",
    test: (file) => {
      const normalizedName = file.name.toLowerCase();
      const normalizedPath = file.relativePath.toLowerCase();
      const looksLikeInstaller =
        normalizedName.includes("setup") || /-win-(x64|arm64|ia32)\.exe$/.test(normalizedName);
      const looksLikeUninstaller = normalizedName.includes("uninstall") || normalizedName.includes(".__uninstaller");
      const fromUnpackedDir = normalizedPath.includes("win-unpacked/");
      const minimumExpectedSizeBytes = 5 * 1024 * 1024;

      return (
        normalizedName.endsWith(".exe") &&
        looksLikeInstaller &&
        !looksLikeUninstaller &&
        !fromUnpackedDir &&
        file.sizeBytes >= minimumExpectedSizeBytes
      );
    },
  },
  {
    id: "linux",
    outputName: "glytch-chat.AppImage",
    test: (file) => file.name.endsWith(".AppImage"),
  },
];

const updaterArtifacts = [
  {
    id: "windows",
    outputDir: path.join(updaterDownloadsDir, "windows"),
    hasManifest: (files) => files.some((file) => file.name.toLowerCase() === "latest.yml"),
    test: (file) => {
      if (file.relativePath.includes("/")) return false;
      const normalizedName = file.name.toLowerCase();
      if (/^latest(?:-[a-z0-9_-]+)?\.yml$/.test(normalizedName) && !normalizedName.includes("mac")) {
        return true;
      }
      if (normalizedName.endsWith(".exe.blockmap")) return true;
      return normalizedName.endsWith(".exe") && !normalizedName.includes("uninstall");
    },
  },
  {
    id: "mac",
    outputDir: path.join(updaterDownloadsDir, "mac"),
    hasManifest: (files) => files.some((file) => /^latest-mac(?:-[a-z0-9_-]+)?\.yml$/.test(file.name.toLowerCase())),
    test: (file) => {
      if (file.relativePath.includes("/")) return false;
      const normalizedName = file.name.toLowerCase();
      if (/^latest-mac(?:-[a-z0-9_-]+)?\.yml$/.test(normalizedName)) return true;
      return (
        normalizedName.endsWith(".zip") ||
        normalizedName.endsWith(".zip.blockmap") ||
        normalizedName.endsWith(".dmg") ||
        normalizedName.endsWith(".dmg.blockmap")
      );
    },
  },
];

function collectReleaseFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const collected = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (entry.isFile()) {
        const stats = fs.statSync(entryPath);
        collected.push({
          path: entryPath,
          relativePath: path.relative(releaseDir, entryPath).replace(/\\/g, "/"),
          name: entry.name,
          mtimeMs: stats.mtimeMs,
          sizeBytes: stats.size,
        });
      }
    }
  }

  return collected;
}

function newestMatch(files, test) {
  const matches = files.filter((file) => test(file));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
}

function ensureDownloadsDir() {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

function ensureEmptyDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function readPackageVersion() {
  if (!fs.existsSync(packageJsonPath)) return "0.0.0";
  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (parsed && typeof parsed.version === "string" && parsed.version.trim()) {
      return parsed.version.trim();
    }
  } catch {
    // Fall back to a safe default if package.json is malformed.
  }
  return "0.0.0";
}

function inferVersionFromArtifactName(fileName, fallbackVersion) {
  const match = fileName.match(/glytch-chat-([0-9A-Za-z.+-]+)-(?:mac|darwin|osx|win|linux)/i);
  if (!match || !match[1]) return fallbackVersion;
  return match[1];
}

function sha256ForFile(filePath) {
  const hash = createHash("sha256");
  const fileBuffer = fs.readFileSync(filePath);
  hash.update(fileBuffer);
  return hash.digest("hex");
}

function newestFilesByName(files) {
  const byName = new Map();
  for (const file of files) {
    const key = file.name.toLowerCase();
    const previous = byName.get(key);
    if (!previous || file.mtimeMs > previous.mtimeMs) {
      byName.set(key, file);
    }
  }
  return Array.from(byName.values());
}

function syncUpdaterArtifacts(files) {
  let copiedAny = false;
  for (const descriptor of updaterArtifacts) {
    ensureEmptyDir(descriptor.outputDir);
    const platformFiles = files.filter((file) => descriptor.test(file));
    if (!descriptor.hasManifest(platformFiles)) {
      console.log(
        `[sync-installers] Skipping updater:${descriptor.id} because the release output is missing latest feed metadata (latest*.yml).`,
      );
      continue;
    }
    const matches = newestFilesByName(platformFiles);
    if (matches.length === 0) {
      console.log(`[sync-installers] No ${descriptor.id} updater artifacts found in release/.`);
      continue;
    }

    for (const match of matches) {
      const destination = path.join(descriptor.outputDir, match.name);
      fs.copyFileSync(match.path, destination);
      copiedAny = true;
      console.log(`[sync-installers] updater:${descriptor.id}: ${match.relativePath} -> ${path.relative(rootDir, destination)}`);
    }
  }
  return copiedAny;
}

function main() {
  const files = collectReleaseFiles(releaseDir);
  if (files.length === 0) {
    console.log("[sync-installers] No files found in release/. Nothing to sync.");
    return;
  }

  ensureDownloadsDir();
  fs.mkdirSync(updaterDownloadsDir, { recursive: true });
  const packageVersion = readPackageVersion();
  const updatesManifest = {
    app: "Glytch Chat",
    generatedAt: new Date().toISOString(),
    version: packageVersion,
    platforms: {},
  };

  let copiedAny = false;
  for (const installer of installers) {
    const match = newestMatch(files, installer.test);
    if (!match) {
      console.log(`[sync-installers] No ${installer.id} installer found in release/.`);
      continue;
    }

    const targetPath = path.join(downloadsDir, installer.outputName);
    fs.copyFileSync(match.path, targetPath);
    copiedAny = true;
    updatesManifest.platforms[installer.id] = {
      version: inferVersionFromArtifactName(match.name, packageVersion),
      fileName: installer.outputName,
      sourceArtifact: match.name,
      sizeBytes: match.sizeBytes,
      sha256: sha256ForFile(match.path),
      updatedAt: new Date(match.mtimeMs).toISOString(),
    };
    console.log(
      `[sync-installers] ${installer.id}: ${match.relativePath} (${Math.round(match.sizeBytes / 1024)} KiB) -> public/downloads/${installer.outputName}`,
    );
  }

  if (!copiedAny) {
    if (fs.existsSync(updatesManifestPath)) {
      fs.rmSync(updatesManifestPath, { force: true });
    }
    console.log("[sync-installers] No supported installer artifacts found.");
    return;
  }

  fs.writeFileSync(updatesManifestPath, `${JSON.stringify(updatesManifest, null, 2)}\n`);
  console.log("[sync-installers] wrote public/downloads/updates.json");

  if (!syncUpdaterArtifacts(files)) {
    console.log("[sync-installers] No updater feed artifacts were synced.");
  }
}

main();
