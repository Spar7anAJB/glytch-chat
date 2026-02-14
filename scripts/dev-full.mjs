import process from "node:process";
import { spawn } from "node:child_process";

const IS_WINDOWS = process.platform === "win32";
const NPM_CMD = IS_WINDOWS ? "npm.cmd" : "npm";

let viteProcess;
let backendProcess;

function spawnCommand(command, args) {
  return spawn(command, args, {
    stdio: "inherit",
  });
}

function terminate(processRef) {
  if (!processRef || processRef.killed || processRef.exitCode !== null) return;
  processRef.kill("SIGTERM");
}

function onSignal() {
  terminate(viteProcess);
  terminate(backendProcess);
  process.exit(0);
}

process.on("SIGINT", onSignal);
process.on("SIGTERM", onSignal);

backendProcess = spawnCommand("node", ["--watch", "backend/server.mjs"]);
viteProcess = spawnCommand(NPM_CMD, ["run", "dev", "--", "--host", "localhost", "--port", "5173", "--strictPort"]);

backendProcess.on("exit", (code) => {
  if (viteProcess?.exitCode === null) {
    console.error("[dev:full] Backend exited unexpectedly. Stopping Vite.");
    terminate(viteProcess);
  }
  process.exit(code ?? 1);
});

viteProcess.on("exit", (code) => {
  terminate(backendProcess);
  process.exit(code ?? 0);
});
