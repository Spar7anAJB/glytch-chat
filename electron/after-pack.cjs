const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function run(command, args) {
  execFileSync(command, args, {
    stdio: "inherit",
  });
}

function runBestEffort(command, args) {
  try {
    execFileSync(command, args, {
      stdio: "ignore",
    });
  } catch {
    // Best-effort cleanup only.
  }
}

function walkFiles(rootPath) {
  const files = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    files.push(current);

    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function stripDisallowedXattrs(rootPath) {
  // Bulk clear first.
  runBestEffort("xattr", ["-cr", rootPath]);

  // Then explicitly remove common troublemaker attrs from every path.
  const allPaths = walkFiles(rootPath);
  for (const filePath of allPaths) {
    runBestEffort("xattr", ["-d", "com.apple.FinderInfo", filePath]);
    runBestEffort("xattr", ["-d", "com.apple.ResourceFork", filePath]);
    runBestEffort("xattr", ["-d", "com.apple.quarantine", filePath]);
  }
}

exports.default = async function afterPack(context) {
  if (!context || context.electronPlatformName !== "darwin") {
    return;
  }

  const appOutDir = context.appOutDir;
  const productName = context.packager?.appInfo?.productFilename || "Glytch Chat";
  const appPath = path.join(appOutDir, `${productName}.app`);

  if (!fs.existsSync(appPath)) {
    throw new Error(`[after-pack] App bundle not found at ${appPath}`);
  }

  // iCloud/Chrome metadata can add attributes that make codesign fail.
  console.log(`[after-pack] Clearing extended attributes before signing: ${appPath}`);
  stripDisallowedXattrs(appPath);

  // Perform ad-hoc signing ourselves to avoid Electron Builder's per-binary signing
  // path that can fail inside iCloud-managed workspaces.
  console.log(`[after-pack] Ad-hoc signing app bundle: ${appPath}`);
  run("codesign", ["--force", "--deep", "--sign", "-", "--timestamp=none", appPath]);

  // Some sync providers may re-add metadata after signing, so clean once more.
  console.log(`[after-pack] Clearing extended attributes after signing: ${appPath}`);
  stripDisallowedXattrs(appPath);

  console.log(`[after-pack] Re-signing app bundle after cleanup: ${appPath}`);
  run("codesign", ["--force", "--deep", "--sign", "-", "--timestamp=none", appPath]);

  console.log(`[after-pack] Verifying app signature: ${appPath}`);
  run("codesign", ["--verify", "--deep", "--verbose=2", appPath]);
};
