# Single shared database — status report

## 1. Railway CLI

- **Installed:** yes (`railway` on PATH).
- **Logged in:** yes (session present).
- **Linked project:** yes (`heroic-abundance`, environment `production`).

## 2. Automatic variable detection

- **Yes**, Postgres variables were fetched via `railway variable list -s Postgres -e production --json`.
- **`.env.railway.local`** was generated with `npm run sync:railway-env` (uses `DATABASE_PUBLIC_URL`, sets `DB_SSL=true`, copies `JWT_SECRET` from `@challenge/api-gateway` when available). Contents are not committed and are not summarized here.

If CLI is unavailable, use **RAILWAY_MANUAL_VALUES_NEEDED.md**.

## 3. `.env.railway.local` created

- **Yes** (gitignored).

## 4. Source code changes

- **Yes:** optional **SSL** for TypeORM when `DB_SSL=true` in `apps/*/db/datasource.ts`.
- **RabbitMQ:** tasks/notifications already use `RABBITMQ_URI` with fallback `amqp://admin:admin@rabbitmq:5672` and queue `notifications_queue`.

## 5. DB SSL support

- **Added:** `ssl: { rejectUnauthorized: false }` when `DB_SSL` is `true` or `1`; otherwise disabled for local Docker Postgres.

## 6. Local app with Railway DB

- **Works** after migration metadata was aligned for an existing Railway database (tables present but `migrations` table empty): **`npm run repair:railway-migrations`** one-time metadata inserts only (no DROP/TRUNCATE).

## 7. Test user in Railway DB

- **Yes** — created via `POST /api/auth/register` on local gateway; verified with a DB row count for `railway_local_test_%` users.

## 8. Test task in Railway DB

- **Yes** — created via `POST /api/tasks` with Bearer token; verified with a DB row count for titles matching `Railway verify %`.

## 9. DBeaver rule

Connect to **Railway Postgres** using the **public** host/port and credentials from the Railway Postgres service (SSL if required). Do **not** use `127.0.0.1:5433` to see this shared dataset (that is local Docker only).

Use the SQL samples in **ONE_MAIN_DATABASE_SETUP.md**.

## 10. Next action for you

1. Keep `.env.railway.local` out of git.
2. After pulling these changes, run `npm run sync:railway-env` (or fill env manually), then `npm run dev:railway-db`.
3. If auth/tasks/notifications fail on startup with **“relation already exists”** during migrations but tables already exist, run **`npm run repair:railway-migrations`** once (metadata only), then `npm run dev:railway-db` again.
4. On Railway, ensure **deployed** services use the same Postgres references and **`DB_SSL=true`** if required — see **RAILWAY_DEPLOY_VARIABLES_TO_SET.md**.

## Changed / added files (this work)

- `apps/auth-service/db/datasource.ts`
- `apps/tasks-service/db/datasource.ts`
- `apps/notifications-service/db/datasource.ts`
- `docker-compose.railway-db.yml` (`DB_SSL`, `depends_on` with `db: !reset null` for Railway mode)
- `.env.railway.example` (`DB_SSL`)
- `package.json` (`sync:railway-env`, `repair:railway-migrations`)
- `scripts/sync-railway-db-env.mjs`
- `scripts/repair-railway-migration-metadata.mjs`
- `RAILWAY_MANUAL_VALUES_NEEDED.md`
- `RAILWAY_DEPLOY_VARIABLES_TO_SET.md`
- `SINGLE_SHARED_DATABASE_STATUS.md` (this file)
