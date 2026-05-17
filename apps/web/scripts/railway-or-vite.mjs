import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.RAILWAY_ENVIRONMENT === "production") {
  const port = process.env.PORT ?? "3000";
  const r = spawnSync(
    "npx",
    ["-y", "serve", "-s", "dist", "-l", `tcp://0.0.0.0:${port}`],
    {
      cwd: workspaceRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    }
  );
  process.exit(typeof r.status === "number" ? r.status : 1);
}

const viteArgs = process.argv.slice(2);
const r = spawnSync("vite", viteArgs, {
  cwd: workspaceRoot,
  stdio: "inherit",
});
process.exit(typeof r.status === "number" ? r.status : 1);
