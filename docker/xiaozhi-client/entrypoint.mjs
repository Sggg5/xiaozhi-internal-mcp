import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const required = ["XIAOZHI_ENDPOINT", "MCP_TOKEN", "MCP_URL"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const configDir = process.env.XIAOZHI_CONFIG_DIR || "/data";
const config = {
  mcpEndpoint: process.env.XIAOZHI_ENDPOINT,
  mcpServers: {
    "xiaozhi-internal-mcp": {
      type: "http",
      url: process.env.MCP_URL,
      apiKey: process.env.MCP_TOKEN,
    },
  },
};

await mkdir(configDir, { recursive: true });
await writeFile(
  `${configDir}/xiaozhi.config.json`,
  `${JSON.stringify(config, null, 2)}\n`,
  { mode: 0o600 },
);

const launcher =
  "/usr/local/lib/node_modules/xiaozhi-client/dist/backend/WebServerLauncher.js";
const child = spawn(process.execPath, [launcher], {
  env: { ...process.env, XIAOZHI_CONFIG_DIR: configDir },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
