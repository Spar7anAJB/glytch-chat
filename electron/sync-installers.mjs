import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const releaseDir = path.join(rootDir, "release");
const downloadsDir = path.join(rootDir, "public", "downloads");

const installers = [
  {
    id: "mac",
    outputName: "glytch-chat-installer.dmg",
    test: (fileName) => fileName.toLowerCase().endsWith(".dmg"),
  },
  {
    id: "windows",
    outputName: "glytch-chat-setup.exe",
    test: (fileName) => {
      const normalized = fileName.toLowerCase();
      return normalized.endsWith(".exe") && !normalized.includes("uninstall");
    },
  },
  {
    id: "linux",
    outputName: "glytch-chat.AppImage",
    test: (fileName) => fileName.endsWith(".AppImage"),
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
          name: entry.name,
          mtimeMs: stats.mtimeMs,
        });
      }
    }
  }

  return collected;
}

function newestMatch(files, test) {
  const matches = files.filter((file) => test(file.name));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
}

function ensureDownloadsDir() {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

function main() {
  const files = collectReleaseFiles(releaseDir);
  if (files.length === 0) {
    console.log("[sync-installers] No files found in release/. Nothing to sync.");
    return;
  }

  ensureDownloadsDir();

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
    console.log(`[sync-installers] ${installer.id}: ${match.name} -> public/downloads/${installer.outputName}`);
  }

  if (!copiedAny) {
    console.log("[sync-installers] No supported installer artifacts found.");
  }
}

main();
