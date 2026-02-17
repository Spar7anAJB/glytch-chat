import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = process.cwd();
const tmpBuildRoot = fs.mkdtempSync(path.join(os.tmpdir(), "glytch-mac-build-"));
const stageDir = path.join(tmpBuildRoot, "workspace");

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

function main() {
  console.log(`[installer:mac] staging workspace in ${stageDir}`);
  fs.mkdirSync(stageDir, { recursive: true });

  copyWorkspaceWithFallback();

  run("npm", ["ci"], { cwd: stageDir });

  run("npm", ["run", "build"], { cwd: stageDir });
  run("npx", ["--yes", "electron-builder@26", "--config", "electron/builder.config.json", "--mac", "dmg", "--publish", "never"], {
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
