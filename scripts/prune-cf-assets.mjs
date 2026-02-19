import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const downloadsDir = path.join(distDir, "downloads");
const cloudflareMaxAssetBytes = 25 * 1024 * 1024;
const safetyMaxAssetBytes = cloudflareMaxAssetBytes - 1024 * 1024;

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function removeLargeAssets(rootDir, maxBytes) {
  const removed = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const info = await stat(fullPath);
      if (info.size > maxBytes) {
        await rm(fullPath, { force: true });
        removed.push({ file: fullPath, size: info.size });
      }
    }
  }

  await walk(rootDir);
  return removed;
}

async function main() {
  if (!(await pathExists(distDir))) {
    console.error("[deploy:cf] dist/ not found. Run `npm run build` before deploy.");
    process.exitCode = 1;
    return;
  }

  if (await pathExists(downloadsDir)) {
    await rm(downloadsDir, { recursive: true, force: true });
    console.log("[deploy:cf] Removed dist/downloads to keep installer binaries out of Cloudflare assets.");
  }

  const removedLargeFiles = await removeLargeAssets(distDir, safetyMaxAssetBytes);
  if (removedLargeFiles.length > 0) {
    for (const item of removedLargeFiles) {
      const relativePath = path.relative(process.cwd(), item.file);
      const sizeMiB = (item.size / (1024 * 1024)).toFixed(1);
      console.log(`[deploy:cf] Removed large asset ${relativePath} (${sizeMiB} MiB).`);
    }
  } else {
    console.log("[deploy:cf] Asset pruning complete. No oversized files remain.");
  }
}

await main();
