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
let managesBackendProcess = false;

function terminate(processRef) {
  if (!processRef || processRef.killed || processRef.exitCode !== null) return;
  processRef.kill("SIGTERM");
}

async function isBackendReady() {
  try {
    const response = await fetch(BACKEND_HEALTH_URL, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
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
    if (backendProcess && backendProcess.exitCode !== null) {
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

async function waitForExistingBackendBoot(maxAttempts = 12, intervalMs = 250) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await isBackendReady()) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
}

function registerSignals() {
  const onSignal = () => {
    terminate(electronProcess);
    if (managesBackendProcess) {
      terminate(backendProcess);
    }
    process.exit(0);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}

async function main() {
  registerSignals();

  if (await isBackendReady()) {
    console.log(`[electron:start] Reusing existing backend at ${BACKEND_HEALTH_URL}`);
  } else if (await waitForExistingBackendBoot()) {
    console.log(`[electron:start] Reusing backend that just became ready at ${BACKEND_HEALTH_URL}`);
  } else {
    managesBackendProcess = true;
    backendProcess = spawn("node", ["backend/server.mjs"], { stdio: "inherit" });
    backendProcess.on("exit", (code) => {
      if (electronProcess?.exitCode === null) {
        terminate(electronProcess);
      }
      process.exit(code ?? 1);
    });
  }
  await waitForBackend();

  const { command, args } = resolveElectronCommand();
  electronProcess = spawn(command, args, { stdio: "inherit" });

  electronProcess.on("exit", (code) => {
    if (managesBackendProcess) {
      terminate(backendProcess);
    }
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(`[electron:start] ${error.message}`);
  terminate(electronProcess);
  if (managesBackendProcess) {
    terminate(backendProcess);
  }
  process.exit(1);
});
