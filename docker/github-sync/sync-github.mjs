import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const repoUrl = process.env.GIT_REPO_URL || "https://github.com/Sggg5/xiaozhi-internal-mcp.git";
const branch = process.env.GIT_BRANCH || "main";
const intervalSeconds = Number(process.env.SYNC_INTERVAL_SECONDS || 3600);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: "/repo",
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function hasRef(ref) {
  try {
    await run("git", ["rev-parse", "--verify", "--quiet", ref]);
    return true;
  } catch {
    return false;
  }
}

async function ensureRepo() {
  await run("git", ["config", "--global", "--add", "safe.directory", "/repo"]);
  await run("git", ["config", "--global", "http.version", "HTTP/1.1"]);

  if (existsSync("/repo/.git")) return;

  console.log(`[github-sync] /repo is not a git repo, cloning ${repoUrl}#${branch}`);
  await run("rm", ["-rf", "/tmp/xiaozhi-mcp"], { cwd: "/" });
  await run("git", [
    "-c",
    "http.version=HTTP/1.1",
    "clone",
    "--branch",
    branch,
    "--depth",
    "1",
    repoUrl,
    "/tmp/xiaozhi-mcp",
  ]);
  await run("sh", ["-c", "cp -a /tmp/xiaozhi-mcp/. /repo/"], { cwd: "/" });
}

async function syncOnce() {
  console.log(`[github-sync] pulling ${repoUrl}#${branch}`);
  await run("git", ["remote", "set-url", "origin", repoUrl]);
  try {
    await run("git", ["fetch", "origin", branch]);
  } catch (error) {
    if (!(await hasRef(`origin/${branch}`))) throw error;
    console.warn(`[github-sync] fetch failed, using cached origin/${branch}`);
    console.warn(error);
  }
  await run("git", ["reset", "--hard", `origin/${branch}`]);
  await run("npm", ["run", "data:build"]);
  console.log("[github-sync] data build complete");
}

for (;;) {
  try {
    await ensureRepo();
    await syncOnce();
  } catch (error) {
    console.error("[github-sync] sync failed");
    console.error(error);
  }

  await delay(Math.max(intervalSeconds, 30) * 1000);
}
