import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = process.cwd();
const tmpBuildRoot = fs.mkdtempSync(path.join(os.tmpdir(), "glytch-mac-build-"));
const stageDir = path.join(tmpBuildRoot, "workspace");

function readEnvKey(filePath, key) {
  if (!fs.existsSync(filePath)) return "";
  const contents = fs.readFileSync(filePath, "utf8");
  const lines = contents.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const lineKey = line.slice(0, separatorIndex).trim();
    if (lineKey !== key) continue;
    let value = line.slice(separatorIndex + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }
    return value.trim();
  }
  return "";
}

function resolveApiUrl(workspaceRoot) {
  if (process.env.VITE_API_URL && process.env.VITE_API_URL.trim()) {
    return process.env.VITE_API_URL.trim();
  }

  const candidateFiles = [
    path.join(workspaceRoot, ".env.production.local"),
    path.join(workspaceRoot, ".env.production"),
    path.join(workspaceRoot, ".env.local"),
    path.join(workspaceRoot, ".env"),
  ];

  for (const filePath of candidateFiles) {
    const value = readEnvKey(filePath, "VITE_API_URL");
    if (value) return value;
  }

  return "";
}

function isLocalApiUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return true;
  }
}

function assertInstallerApiUrl(workspaceRoot) {
  const apiUrl = resolveApiUrl(workspaceRoot);
  if (!apiUrl) {
    throw new Error("[installer:mac] Missing VITE_API_URL. Set it to your hosted backend URL before building installers.");
  }
  if (isLocalApiUrl(apiUrl)) {
    throw new Error("[installer:mac] VITE_API_URL points to localhost. Use your deployed backend URL for distributable installers.");
  }
}

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: "inherit",
    ...options,
  });
}

function copyWorkspaceWithFallback() {
  const excludes = new Set([".git", "dist", "release", "public/downloads", "node_modules"]);

  try {
    run("rsync", [
      "-a",
      "--delete",
      "--exclude",
      ".git",
      "--exclude",
      "dist",
      "--exclude",
      "release",
      "--exclude",
      "public/downloads",
      "--exclude",
      "node_modules",
      `${rootDir}/`,
      `${stageDir}/`,
    ]);
    return;
  } catch {
    const filter = (sourcePath) => {
      const relative = path.relative(rootDir, sourcePath).replace(/\\/g, "/");
      if (!relative) return true;
      for (const blocked of excludes) {
        if (relative === blocked || relative.startsWith(`${blocked}/`)) {
          return false;
        }
      }
      return true;
    };
    fs.cpSync(rootDir, stageDir, { recursive: true, filter });
  }
}

function copyReleaseBack() {
  const stagedReleaseDir = path.join(stageDir, "release");
  if (!fs.existsSync(stagedReleaseDir)) {
    throw new Error("[installer:mac] Missing staged release directory after build.");
  }

  const rootReleaseDir = path.join(rootDir, "release");
  fs.rmSync(rootReleaseDir, { recursive: true, force: true });
  fs.cpSync(stagedReleaseDir, rootReleaseDir, { recursive: true });
}

function readPackageVersion(workspaceRoot) {
  const packageJsonPath = path.join(workspaceRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) return "0.0.0";
  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (parsed && typeof parsed.version === "string" && parsed.version.trim()) {
      return parsed.version.trim();
    }
  } catch {
    // Ignore malformed json in staging check.
  }
  return "0.0.0";
}

function main() {
  console.log(`[installer:mac] staging workspace in ${stageDir}`);
  fs.mkdirSync(stageDir, { recursive: true });

  copyWorkspaceWithFallback();
  console.log(`[installer:mac] root version=${readPackageVersion(rootDir)} staged version=${readPackageVersion(stageDir)}`);
  assertInstallerApiUrl(stageDir);

  run("npm", ["ci"], { cwd: stageDir });

  run("npm", ["run", "build"], { cwd: stageDir });
  run("npx", ["--yes", "electron-builder@26", "--config", "electron/builder.config.json", "--mac", "--publish", "never"], {
    cwd: stageDir,
    env: {
      ...process.env,
      COPYFILE_DISABLE: "1",
    },
  });

  copyReleaseBack();
  run("node", ["electron/sync-installers.mjs"], { cwd: rootDir });

  console.log("[installer:mac] Done.");
}

try {
  main();
} finally {
  fs.rmSync(tmpBuildRoot, { recursive: true, force: true });
}
