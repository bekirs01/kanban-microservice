# One database final report

Date: setup for **Railway PostgreSQL as the shared primary database** for local + deployed workloads.

---

## Changed files

| File | Change |
|------|--------|
| `apps/tasks-service/src/task/task.module.ts` | RMQ client uses `RABBITMQ_URI` and queue `notifications_queue` |
| `apps/tasks-service/src/comment/comment.module.ts` | Same |
| `apps/tasks-service/src/main.ts` | Default RMQ URL host `rabbitmq` (Docker service name) |
| `apps/notifications-service/src/main.ts` | Default RMQ URL host `rabbitmq` |
| `docker-compose.railway-db.yml` | Replaced `depends_on` so services do not require local `db`; Railway `DB_*` + JWT/RABBITMQ overrides |
| `scripts/dev-backend-railway-db.sh` | Validates five `RAILWAY_DB_*` keys; starts stack **without** `db` |
| `.env.railway.example` | Placeholders only |
| `package.json` | Added `dev:railway-db`, `dev:local-db`; kept `dev:backend:railway-db` alias |
| `ONE_MAIN_DATABASE_SETUP.md` | **Primary** developer doc for this workflow |
| `ONE_DATABASE_FINAL_REPORT.md` | This summary |
| `LOCAL_WITH_RAILWAY_DB.md` | Short supplement; points to `ONE_MAIN_DATABASE_SETUP.md` |

`.gitignore` already contained `.env.railway.local` — no change required.

---

## Source code

**Yes.** Only **RabbitMQ** wiring in **tasks-service** and **notifications-service** `main.ts`, plus **task** / **comment** modules — narrow scope, no unrelated refactors.

---

## Command: local app with Railway DB

After creating `.env.railway.local` from Railway Postgres:

```bash
npm run dev:railway-db
```

Equivalent: `bash scripts/dev-backend-railway-db.sh`

**Fallback (local Docker Postgres only):**

```bash
npm run dev:local-db
```

---

## DBeaver rule

Use **Railway dashboard → Postgres → connection** (public host/port, `PG*` values, SSL if required).

**Not** `127.0.0.1:5433` for shared/deployed data — that remains **local Docker only**.

---

## Railway variables to copy into `.env.railway.local`

From **Postgres** service:

- `PGHOST` → `RAILWAY_DB_HOST`
- `PGPORT` → `RAILWAY_DB_PORT`
- `PGUSER` → `RAILWAY_DB_USER`
- `PGPASSWORD` → `RAILWAY_DB_PASS`
- `PGDATABASE` → `RAILWAY_DB_NAME`

Optional: `JWT_SECRET`, `RABBITMQ_URI` (see `ONE_MAIN_DATABASE_SETUP.md`).

---

## SQL verification

See **ONE_MAIN_DATABASE_SETUP.md** — users, tasks, and notifications queries.

---

## Local Docker DB

Still available via `npm run dev:local-db`; volume untouched. Not the default path when you use `dev:railway-db`.

---

## Modes summary

| Script | DB writes go to |
|--------|-----------------|
| `npm run dev:railway-db` | **Railway PostgreSQL** |
| `npm run dev:local-db` | **Local Docker `db`** |
| Deployed Railway services | **Railway PostgreSQL** (when variables reference Railway Postgres) |

Local frontend always talks to **local gateway** `http://localhost:3001`; deployed web must use public `VITE_API_URL` / `VITE_WEBSOCKET_URL` baked at build.
