import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const manifestPath = path.join(repoRoot, "native", "voice_engine_core", "Cargo.toml");
const artifactPath = path.join(
  repoRoot,
  "native",
  "voice_engine_core",
  "target",
  "wasm32-unknown-unknown",
  "release",
  "voice_engine_core.wasm",
);
const outputDir = path.join(repoRoot, "public", "wasm");
const outputPath = path.join(outputDir, "voice_engine_core.wasm");
const optional = process.argv.includes("--optional");
const cargoEnvPath = path.join(process.env.HOME || "", ".cargo", "bin");
const envPath = [process.env.PATH || "", cargoEnvPath].join(path.delimiter);

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: envPath,
    },
  });
}

function fail(message) {
  if (optional) {
    console.warn(`[voice-rust] ${message} (optional build skipped)`);
    process.exit(0);
  }
  console.error(`[voice-rust] ${message}`);
  process.exit(1);
}

const cargoVersion = spawnSync("cargo", ["--version"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PATH: envPath,
  },
  encoding: "utf8",
});

if (cargoVersion.status !== 0) {
  fail("cargo not found. Install Rust toolchain and retry.");
}

console.log("[voice-rust] Ensuring wasm target is installed...");
const targetInstall = run("rustup", ["target", "add", "wasm32-unknown-unknown"]);
if (targetInstall.status !== 0) {
  fail("failed to install wasm32-unknown-unknown target");
}

console.log("[voice-rust] Building Rust voice core...");
const buildResult = run("cargo", [
  "build",
  "--manifest-path",
  manifestPath,
  "--target",
  "wasm32-unknown-unknown",
  "--release",
]);
if (buildResult.status !== 0) {
  fail("cargo build failed");
}

if (!existsSync(artifactPath)) {
  fail(`expected wasm artifact not found at ${artifactPath}`);
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(artifactPath, outputPath);
console.log(`[voice-rust] Copied ${path.relative(repoRoot, outputPath)}`);
