import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const IS_WINDOWS = process.platform === "win32";
const NPX_CMD = IS_WINDOWS ? "npx.cmd" : "npx";
const BACKEND_HEALTH_URL = "http://127.0.0.1:8787/api/health";

let backendProcess;
let electronProcess;

function terminate(processRef) {
  if (!processRef || processRef.killed || processRef.exitCode !== null) return;
  processRef.kill("SIGTERM");
}

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

async function waitForBackend(maxAttempts = 120, intervalMs = 500) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (backendProcess?.exitCode !== null) {
      throw new Error("Backend exited before it was ready.");
    }
    try {
      const response = await fetch(BACKEND_HEALTH_URL, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Backend not ready yet.
    }
    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for backend at ${BACKEND_HEALTH_URL}`);
}

function registerSignals() {
  const onSignal = () => {
    terminate(electronProcess);
    terminate(backendProcess);
    process.exit(0);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}

async function main() {
  registerSignals();

  backendProcess = spawn("node", ["backend/server.mjs"], { stdio: "inherit" });
  backendProcess.on("exit", (code) => {
    if (electronProcess?.exitCode === null) {
      terminate(electronProcess);
    }
    process.exit(code ?? 1);
  });
  await waitForBackend();

  const { command, args } = resolveElectronCommand();
  electronProcess = spawn(command, args, { stdio: "inherit" });

  electronProcess.on("exit", (code) => {
    terminate(backendProcess);
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(`[electron:start] ${error.message}`);
  terminate(electronProcess);
  terminate(backendProcess);
  process.exit(1);
});
