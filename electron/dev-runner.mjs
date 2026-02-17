import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const DEV_SERVER_URL = "http://localhost:5173";
const BACKEND_URL = "http://127.0.0.1:8787/api/health";
const IS_WINDOWS = process.platform === "win32";
const NPM_CMD = IS_WINDOWS ? "npm.cmd" : "npm";
const NPX_CMD = IS_WINDOWS ? "npx.cmd" : "npx";

let viteProcess;
let backendProcess;
let electronProcess;
let managesBackendProcess = false;

function spawnCommand(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    ...options,
  });
}

function terminate(processRef) {
  if (!processRef || processRef.killed || processRef.exitCode !== null) return;
  processRef.kill("SIGTERM");
}

async function isBackendReady() {
  try {
    const response = await fetch(BACKEND_URL, { method: "GET" });
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

  // Fallback lets desktop mode run even if electron isn't installed locally yet.
  return { command: NPX_CMD, args: ["--yes", "electron@35", "."] };
}

async function waitForVite(maxAttempts = 120, intervalMs = 500) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (viteProcess?.exitCode !== null) {
      throw new Error("Vite exited before the dev server was ready.");
    }

    try {
      const response = await fetch(DEV_SERVER_URL, { method: "GET" });
      if (response.status < 500) {
        return;
      }
    } catch {
      // Server not up yet.
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for Vite at ${DEV_SERVER_URL}`);
}

function registerSignals() {
  const onSignal = () => {
    terminate(electronProcess);
    terminate(viteProcess);
    if (managesBackendProcess) {
      terminate(backendProcess);
    }
    process.exit(0);
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}

async function waitForBackend(maxAttempts = 120, intervalMs = 500) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (backendProcess && backendProcess.exitCode !== null) {
      throw new Error("Backend exited before it was ready.");
    }

    try {
      const response = await fetch(BACKEND_URL, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Backend not up yet.
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for backend at ${BACKEND_URL}`);
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

async function main() {
  registerSignals();

  if (await isBackendReady()) {
    console.log(`[electron:dev] Reusing existing backend at ${BACKEND_URL}`);
  } else if (await waitForExistingBackendBoot()) {
    console.log(`[electron:dev] Reusing backend that just became ready at ${BACKEND_URL}`);
  } else {
    managesBackendProcess = true;
    backendProcess = spawnCommand("node", ["backend/server.mjs"]);
    backendProcess.on("exit", (code) => {
      if (viteProcess?.exitCode === null || electronProcess?.exitCode === null) {
        console.error(
          "[electron:dev] Backend exited unexpectedly; closing app processes.",
        );
        terminate(electronProcess);
        terminate(viteProcess);
      }
      process.exit(code ?? 1);
    });
  }

  viteProcess = spawnCommand(NPM_CMD, [
    "run",
    "dev",
    "--",
    "--host",
    "localhost",
    "--port",
    "5173",
    "--strictPort",
  ]);

  viteProcess.on("exit", (code) => {
    if (!electronProcess) {
      process.exit(code ?? 1);
      return;
    }

    if (electronProcess.exitCode === null) {
      console.error(
        "[electron:dev] Vite exited unexpectedly; closing Electron.",
      );
      terminate(electronProcess);
    }
  });

  await waitForBackend();
  await waitForVite();

  const { command, args } = resolveElectronCommand();
  electronProcess = spawnCommand(command, args, {
    env: {
      ...process.env,
      ELECTRON_DEV_SERVER_URL: DEV_SERVER_URL,
    },
  });

  electronProcess.on("exit", (code) => {
    terminate(viteProcess);
    if (managesBackendProcess) {
      terminate(backendProcess);
    }
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(`[electron:dev] ${error.message}`);
  terminate(electronProcess);
  terminate(viteProcess);
  if (managesBackendProcess) {
    terminate(backendProcess);
  }
  process.exit(1);
});
