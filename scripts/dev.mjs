import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const isWindows = process.platform === "win32";
const npx = isWindows ? "npx.cmd" : "npx";

const processes = [
  {
    name: "convex",
    color: "\x1b[35m",
    command: npx,
    args: ["convex", "dev"],
  },
  {
    name: "next",
    color: "\x1b[36m",
    command: npx,
    args: ["next", "dev", "-H", "0.0.0.0"],
  },
];

const reset = "\x1b[0m";
let isShuttingDown = false;
const children = [];

function getChildEnv() {
  if (!isWindows) {
    return process.env;
  }

  const env = {};
  const seen = new Set();

  for (const [key, value] of Object.entries(process.env)) {
    const normalizedKey = key.toLowerCase();

    if (seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    env[key] = value;
  }

  return env;
}

function prefixOutput(stream, label) {
  const reader = createInterface({ input: stream });

  reader.on("line", (line) => {
    console.log(`${label} ${line}`);
  });
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      if (isWindows) {
        spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
          env: getChildEnv(),
          stdio: "ignore",
        });
      } else {
        child.kill();
      }
    }
  }

  setTimeout(() => process.exit(exitCode), 250);
}

for (const processConfig of processes) {
  const command = isWindows ? "cmd.exe" : processConfig.command;
  const args = isWindows
    ? ["/d", "/s", "/c", [processConfig.command, ...processConfig.args].join(" ")]
    : processConfig.args;
  const child = spawn(command, args, {
    env: getChildEnv(),
    shell: false,
    stdio: ["inherit", "pipe", "pipe"],
  });
  const label = `${processConfig.color}[${processConfig.name}]${reset}`;

  children.push(child);
  prefixOutput(child.stdout, label);
  prefixOutput(child.stderr, label);

  child.on("error", (error) => {
    console.error(`${label} ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    const exitCode = code ?? 1;
    console.log(`${label} exited${signal ? ` with signal ${signal}` : ` with code ${exitCode}`}`);
    shutdown(exitCode);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
