# Final database visibility report

## Architecture (one shared Railway PostgreSQL)

| Consumer | Database |
|----------|----------|
| **Local app** (`npm run dev:railway-db`) | **Railway PostgreSQL** via `RAILWAY_DB_*` / `DB_SSL` in Docker |
| **Deployed Railway app** | **Same** Railway PostgreSQL when each service’s `DB_*` variables reference the Railway Postgres plugin |
| **DBeaver** | **Same** Railway PostgreSQL using the **public** host/port and credentials (see `DBEAVER_RAILWAY_CONNECTION_INFO.md`) |

Local Docker **`db`** may still run on your machine for other workflows; it is **not** the primary store for Railway DB mode.

## Verified in this run

- **`.env.railway.local`:** Present with `RAILWAY_DB_HOST`, `RAILWAY_DB_PORT`, `RAILWAY_DB_USER`, `RAILWAY_DB_PASS`, `RAILWAY_DB_NAME`, and `DB_SSL=true`.
- **Stack:** `npm run dev:railway-db`; **API:** `GET /api/health` returned ok.
- **Test user:** Registered via `POST /api/auth/register` with username pattern `final_db_test_<timestamp>` — **found** in `auth_service.users` on Railway Postgres.
- **Test task:** Created via `POST /api/tasks` with title `Final DB test task <timestamp>` — **found** in `task_service.tasks` on Railway Postgres.

## DBeaver — fields to enter

Use **PostgreSQL**. Copy from **your local** `.env.railway.local`:

- **Host** = `RAILWAY_DB_HOST`
- **Port** = `RAILWAY_DB_PORT`
- **Database** = `RAILWAY_DB_NAME`
- **Username** = `RAILWAY_DB_USER`
- **Password** = `RAILWAY_DB_PASS` (never commit; never paste into shared chat)

Enable **SSL** when **`DB_SSL=true`**.

## SQL queries to run

Same as `DBEAVER_RAILWAY_CONNECTION_INFO.md` (users, tasks, comments, task_history, notifications).

## Remaining manual actions

1. In DBeaver, create/update the connection using values from `.env.railway.local` only on your machine.
2. On **Railway**, ensure deployed **auth**, **tasks**, and **notifications** services each have `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, and **`DB_SSL=true`** if your driver needs TLS to the same instance (see `RAILWAY_DEPLOY_VARIABLES_TO_SET.md`).
3. Re-run **`npm run sync:railway-env`** after Railway rotates database credentials, then refresh DBeaver and local `.env.railway.local`.

## Optional

If startup fails with migration errors but tables already exist, see **`npm run repair:railway-migrations`** and `ONE_MAIN_DATABASE_SETUP.md`.
