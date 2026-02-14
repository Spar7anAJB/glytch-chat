import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const IS_WINDOWS = process.platform === "win32";
const NPX_CMD = IS_WINDOWS ? "npx.cmd" : "npx";

function resolveElectronCommand() {
  const localElectron = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    IS_WINDOWS ? "electron.cmd" : "electron",
  );

  if (fs.existsSync(localElectron)) {
    return { command: localElectron, args: ["."] };
  }

  // Fallback lets production desktop mode run before local dev deps are installed.
  return { command: NPX_CMD, args: ["--yes", "electron@35", "."] };
}

const { command, args } = resolveElectronCommand();
const child = spawn(command, args, { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
