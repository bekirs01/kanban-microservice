import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(root, ".env.railway.local"), "utf8");
const env = {};
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).replace(/\\"/g, '"');
  }
  env[k] = v;
}

const host = env.RAILWAY_DB_HOST;
const port = parseInt(env.RAILWAY_DB_PORT || "5432", 10);
const user = env.RAILWAY_DB_USER;
const password = env.RAILWAY_DB_PASS;
const database = env.RAILWAY_DB_NAME;
const ssl =
  env.DB_SSL === "true" || env.DB_SSL === "1"
    ? { rejectUnauthorized: false }
    : undefined;

if (!host || !user || password === undefined || !database) {
  console.error("Missing RAILWAY_DB_* in .env.railway.local");
  process.exit(1);
}

const suites = [
  {
    schema: "auth_service",
    rows: [
      [1764995289244, "CreateUserTable1764995289244"],
      [
        1765483388960,
        "AlterTableUserAddRefreshTokenHashAndPasswordHash1765483388960",
      ],
    ],
  },
  {
    schema: "task_service",
    rows: [
      [1765044450524, "CreateTasksTable1765044450524"],
      [1765208180948, "AlterTableTasksAddAssignees1765208180948"],
      [1765217182623, "CreateTableComments1765217182623"],
      [1765495680814, "CreateTableTaskHistory1765495680814"],
    ],
  },
  {
    schema: "notification_service",
    rows: [
      [1765285176813, "CreateTableNotifications1765285176813"],
    ],
  },
];

const client = new pg.Client({ host, port, user, password, database, ssl });
await client.connect();

for (const { schema, rows } of suites) {
  const tbl = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'migrations'`,
    [schema]
  );
  if (tbl.rowCount === 0) {
    console.log("Skip (no migrations table):", schema);
    continue;
  }
  for (const [ts, name] of rows) {
    const r = await client.query(
      `SELECT 1 FROM ${schema}.migrations WHERE name = $1 LIMIT 1`,
      [name]
    );
    if (r.rowCount === 0) {
      await client.query(
        `INSERT INTO ${schema}.migrations (timestamp, name) VALUES ($1, $2)`,
        [ts, name]
      );
      console.log("Inserted migration record:", schema, name);
    }
  }
}

await client.end();
console.log("Migration metadata aligned where tables already exist.");
