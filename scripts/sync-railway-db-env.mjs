import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function escEnvValue(v) {
  if (v == null || v === "") return '""';
  const s = String(v);
  if (/[\r\n]/.test(s)) throw new Error("Value contains unsupported characters for .env");
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const raw = sh(
  "railway variable list -s Postgres -e production --json"
);
const json = JSON.parse(raw);
const dbUrl =
  json.DATABASE_PUBLIC_URL || json.DATABASE_URL || json.DATABASE_PRIVATE_URL;
if (!dbUrl) {
  throw new Error(
    "No DATABASE_PUBLIC_URL / DATABASE_URL on Railway Postgres service."
  );
}
const u = new URL(dbUrl.replace(/^postgresql:/i, "postgres:"));

let jwt = "";
try {
  const g = JSON.parse(
    sh(
      'railway variable list -s "@challenge/api-gateway" -e production --json'
    )
  );
  if (typeof g.JWT_SECRET === "string" && g.JWT_SECRET.length > 0) {
    jwt = g.JWT_SECRET;
  }
} catch {
}

const lines = [
  `RAILWAY_DB_HOST=${escEnvValue(u.hostname)}`,
  `RAILWAY_DB_PORT=${escEnvValue(u.port || "5432")}`,
  `RAILWAY_DB_USER=${escEnvValue(decodeURIComponent(u.username))}`,
  `RAILWAY_DB_PASS=${escEnvValue(decodeURIComponent(u.password))}`,
  `RAILWAY_DB_NAME=${escEnvValue((u.pathname || "/").replace(/^\//, "") || "postgres")}`,
  `DB_SSL=true`,
  `JWT_SECRET=${escEnvValue(jwt)}`,
  `RABBITMQ_URI=`,
];

writeFileSync(join(root, ".env.railway.local"), lines.join("\n") + "\n");
console.log("Wrote .env.railway.local (contents not shown).");
