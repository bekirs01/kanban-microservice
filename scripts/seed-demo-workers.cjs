"use strict";

const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");

function loadEnvFile(p) {
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(ROOT, ".env.railway.local"));
loadEnvFile(path.resolve(ROOT, ".env"));

const usingRailway =
  !!process.env.RAILWAY_DB_HOST &&
  !!process.env.RAILWAY_DB_USER &&
  !!process.env.RAILWAY_DB_PASS &&
  !!process.env.RAILWAY_DB_NAME;

const DB_HOST = usingRailway
  ? process.env.RAILWAY_DB_HOST
  : process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(
  usingRailway
    ? process.env.RAILWAY_DB_PORT || "5432"
    : process.env.DB_PORT || "5433",
  10,
);
const DB_USER = usingRailway
  ? process.env.RAILWAY_DB_USER
  : process.env.DB_USER || "postgres";
const DB_PASS = usingRailway
  ? process.env.RAILWAY_DB_PASS
  : process.env.DB_PASS || "password";
const DB_NAME = usingRailway
  ? process.env.RAILWAY_DB_NAME
  : process.env.DB_NAME || "challenge_db";
const DB_SSL =
  process.env.DB_SSL === "true" ||
  process.env.DB_SSL === "1" ||
  (usingRailway && process.env.DB_SSL !== "false");

const SCHEMA = "auth_service";
const DEMO_PASSWORD = "WorkerDemo123!";

const DEMO_WORKERS = [
  {
    username: "anna.smirnova",
    email: "anna.smirnova@example.com",
    displayName: "Анна Смирнова",
    specialization: "FRONTEND",
    bio: "Frontend-разработчик, отвечает за интерфейс, UX и визуальную часть задач.",
    skills: ["React", "TypeScript", "UI", "CSS"],
    avatarData:
      "https://api.dicebear.com/9.x/lorelei/png?seed=anna.smirnova&size=256&backgroundColor=ffd5dc,ffdfbf,ffe8b2",
  },
  {
    username: "maria.ivanova",
    email: "maria.ivanova@example.com",
    displayName: "Мария Иванова",
    specialization: "BACKEND",
    bio: "Backend-разработчик, работает с API, базой данных и бизнес-логикой.",
    skills: ["NestJS", "PostgreSQL", "TypeORM", "API"],
    avatarData:
      "https://api.dicebear.com/9.x/lorelei/png?seed=maria.ivanova&size=256&backgroundColor=c0e8ff,b6e3f4,d1d4f9",
  },
  {
    username: "ekaterina.petrova",
    email: "ekaterina.petrova@example.com",
    displayName: "Екатерина Петрова",
    specialization: "QA",
    bio: "QA-инженер, проверяет стабильность задач, сценарии и качество продукта.",
    skills: ["Testing", "QA", "Bug reports", "Regression"],
    avatarData:
      "https://api.dicebear.com/9.x/lorelei/png?seed=ekaterina.petrova&size=256&backgroundColor=c0aede,d1d4f9,ffd5dc",
  },
  {
    username: "alina.kuznetsova",
    email: "alina.kuznetsova@example.com",
    displayName: "Алина Кузнецова",
    specialization: "DESIGNER",
    bio: "Product/UI дизайнер, отвечает за удобство интерфейса и визуальный стиль.",
    skills: ["UI/UX", "Figma", "Design systems", "Prototyping"],
    avatarData:
      "https://api.dicebear.com/9.x/lorelei/png?seed=alina.kuznetsova&size=256&backgroundColor=ffdfbf,ffd5dc,b6e3f4",
  },
  {
    username: "dmitry.volkov",
    email: "dmitry.volkov@example.com",
    displayName: "Дмитрий Волков",
    specialization: "DEVOPS",
    bio: "DevOps-инженер, отвечает за деплой, инфраструктуру и стабильность сервисов.",
    skills: ["Docker", "Railway", "CI/CD", "Monitoring"],
    avatarData:
      "https://api.dicebear.com/9.x/avataaars/png?seed=dmitry.volkov&size=256&backgroundColor=b6e3f4,c0e8ff",
  },
];

function resolveModuleFrom(baseDir, name) {
  return require(require.resolve(name, { paths: [baseDir] }));
}

let pg;
let bcrypt;
try {
  pg = resolveModuleFrom(ROOT, "pg");
} catch (_) {
  pg = require("pg");
}
try {
  bcrypt = resolveModuleFrom(
    path.join(ROOT, "apps/auth-service"),
    "bcryptjs",
  );
} catch (_) {
  try {
    bcrypt = require("bcryptjs");
  } catch (__) {
    bcrypt = require("bcrypt");
  }
}

async function upsertWorker(client, passwordHash, worker) {
  const emailNorm = worker.email.trim().toLowerCase();
  const usernameTrim = worker.username.trim();
  const skillsJson = JSON.stringify(worker.skills);

  const existing = await client.query(
    `SELECT id FROM "${SCHEMA}"."users"
       WHERE LOWER(email) = $1 OR username = $2
       LIMIT 1`,
    [emailNorm, usernameTrim],
  );

  if (existing.rowCount > 0) {
    const id = existing.rows[0].id;
    await client.query(
      `UPDATE "${SCHEMA}"."users"
         SET username = $2,
             email = $3,
             "passwordHash" = $4,
             role = 'USER',
             "displayName" = $5,
             specialization = $6,
             bio = $7,
             skills = $8::jsonb,
             "avatarData" = $9,
             "updatedAt" = NOW()
       WHERE id = $1`,
      [
        id,
        usernameTrim,
        emailNorm,
        passwordHash,
        worker.displayName,
        worker.specialization,
        worker.bio,
        skillsJson,
        worker.avatarData,
      ],
    );
    return { username: usernameTrim, email: emailNorm, outcome: "updated", id };
  }

  const inserted = await client.query(
    `INSERT INTO "${SCHEMA}"."users"
       (username, email, "passwordHash", role,
        "displayName", specialization, bio, skills, "avatarData")
     VALUES ($1, $2, $3, 'USER', $4, $5, $6, $7::jsonb, $8)
     RETURNING id`,
    [
      usernameTrim,
      emailNorm,
      passwordHash,
      worker.displayName,
      worker.specialization,
      worker.bio,
      skillsJson,
      worker.avatarData,
    ],
  );

  return {
    username: usernameTrim,
    email: emailNorm,
    outcome: "created",
    id: inserted.rows[0].id,
  };
}

async function main() {
  console.log(`[seed-demo-workers] target: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
  console.log(
    `[seed-demo-workers] mode: ${
      usingRailway ? "Railway DB (via .env.railway.local)" : "Local Docker DB"
    }`,
  );

  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    ssl: DB_SSL ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    for (const worker of DEMO_WORKERS) {
      const res = await upsertWorker(client, passwordHash, worker);
      console.log(
        `  - ${String(res.outcome).padEnd(8)} ${res.username} (${res.email})`,
      );
    }

    const verify = await client.query(
      `SELECT username, email, role,
              "displayName", specialization,
              (skills IS NOT NULL) AS has_skills,
              ("avatarData" IS NOT NULL AND length("avatarData") > 0) AS has_avatar
         FROM "${SCHEMA}"."users"
        WHERE email IN ($1, $2, $3, $4, $5)
        ORDER BY username`,
      DEMO_WORKERS.map((w) => w.email.toLowerCase()),
    );

    console.log("\n[seed-demo-workers] DB verification:");
    for (const row of verify.rows) {
      console.log(
        `  - ${row.username} | role=${row.role} | spec=${row.specialization} | avatar=${row.has_avatar} | skills=${row.has_skills}`,
      );
    }

    const ok =
      verify.rowCount === DEMO_WORKERS.length &&
      verify.rows.every(
        (r) =>
          r.role === "USER" &&
          r.has_avatar === true &&
          r.has_skills === true &&
          !!r.specialization,
      );

    if (!ok) {
      console.error(
        "[seed-demo-workers] verification failed: not all rows have role=USER, avatar and skills.",
      );
      process.exitCode = 1;
    } else {
      console.log("\n[seed-demo-workers] OK — 5 USER/Worker accounts ready.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[seed-demo-workers] ERROR:", err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
