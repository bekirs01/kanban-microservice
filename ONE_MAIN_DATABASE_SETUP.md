# One main database: Railway PostgreSQL

This is the **recommended** setup for daily development when you want **one shared database** for:

- Local Docker backends (and browser UI on localhost)
- Railway-deployed services
- DBeaver

**Railway PostgreSQL** holds **auth_service**, **task_service**, and **notification_service** schemas (same as documented in `DATABASE_STRUCTURE_EXPLANATION.md`).

---

## What is primary vs fallback

| Mode | Database | Command |
|------|-----------|---------|
| **Primary (recommended)** | **Railway Postgres** | `npm run dev:railway-db` |
| **Optional fallback** | Local Docker `db` volume (`127.0.0.1:5433` on host per `docker-compose.yml`) | `npm run dev:local-db` |

Local Docker Postgres **is not deleted**; it remains for offline or isolated work. **Do not** expose it publicly or connect Railway to your Mac.

---

## Local run (shared Railway database)

### Step 1

```bash
cp .env.railway.example .env.railway.local
```

### Step 2

Edit `.env.railway.local`. Set **non-empty** values from **Railway → your project → Postgres service → Variables** (or **Connect** tab):

| Variable | Copy from Railway |
|----------|-------------------|
| `RAILWAY_DB_HOST` | `PGHOST` or hostname in `DATABASE_URL` / public proxy host |
| `RAILWAY_DB_PORT` | `PGPORT` (often `5432` for internal-style values; use the port Railway shows for your connection method) |
| `RAILWAY_DB_USER` | `PGUSER` |
| `RAILWAY_DB_PASS` | `PGPASSWORD` |
| `RAILWAY_DB_NAME` | `PGDATABASE` (often `railway`) |
| `DB_SSL` | `true` for Railway **public** host (TLS); `false` for local Docker Postgres |

Optional:

| Variable | When |
|----------|------|
| `JWT_SECRET` | Should match **api-gateway**, **auth-service**, and **notifications-service** on Railway if you share auth tokens across local + cloud |
| `RABBITMQ_URI` | Omit to use **local Docker RabbitMQ** (`amqp://admin:admin@rabbitmq:5672`). Set to Railway RabbitMQ only if you use that broker end-to-end |

### Automate `.env.railway.local` (Railway CLI)

If you are logged in and linked:

```bash
npm run sync:railway-env
```

This writes `.env.railway.local` from the **Postgres** service (`DATABASE_PUBLIC_URL`) and copies `JWT_SECRET` from **`@challenge/api-gateway`** when available. It does not print secrets.

### First-time / existing Railway DB and migrations

If tables already exist but TypeORM’s `migrations` table is empty, startup may fail with **relation already exists**. Run once (inserts migration **metadata** only):

```bash
npm run repair:railway-migrations
```

Then run `npm run dev:railway-db` again.

**Never commit** `.env.railway.local` (it is gitignored).

### Step 3

```bash
npm run dev:railway-db
```

This starts **rabbitmq**, **auth-service**, **tasks-service**, **notifications-service**, **api-gateway**, and **web**. Backends use **Railway** `DB_*` / `DB_SSL` via `docker-compose.railway-db.yml`; the local **`db`** service is **not** a dependency for those services in this mode (you may still have an old `db` container running from a previous session).

If SSL errors occur when connecting to Railway Postgres from Docker, enable SSL in the client driver (TypeORM/Node `pg` may need `ssl` in datasource for strict providers — address errors as they appear).

### Step 4

Open the app:

**http://localhost:3000**

### Step 5

Confirm data in **DBeaver** using a **Railway** connection (see below), not `127.0.0.1:5433`.

---

## Frontend URLs (local)

- **UI:** `http://localhost:3000`
- **API (browser → gateway):** `http://localhost:3001` (from `apps/web/.env` → `VITE_API_URL`)

The gateway still runs locally in Docker; only **PostgreSQL** is remote (Railway).

## Railway-deployed web

The deployed frontend must be built with:

```env
VITE_API_URL=https://<your-api-gateway-public-url>
VITE_WEBSOCKET_URL=https://<your-notifications-service-public-url>
```

Same **Postgres** service variables as below should be attached to **auth**, **tasks**, and **notifications** on Railway.

---

## DBeaver: Railway PostgreSQL (shared data)

To see rows written by **both** local and deployed apps, connect DBeaver to **Railway Postgres** using dashboard values:

| Field | Source |
|-------|--------|
| Host | Railway Postgres **public** host (e.g. `*.proxy.rlwy.net`) |
| Port | Railway Postgres **public** port |
| Database | `PGDATABASE` / value you use as `RAILWAY_DB_NAME` |
| Username | `PGUSER` |
| Password | `PGPASSWORD` |
| SSL | Enable if Railway requires TLS (typical for public endpoints) |

**Do not** use `127.0.0.1:5433` to inspect this shared database — that is **only** the local Docker Postgres from `docker-compose.yml`.

---

## SQL verification (run against Railway DB in DBeaver)

**Users**

```sql
SELECT id, username, email, "createdAt"
FROM auth_service.users
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Tasks**

```sql
SELECT id, title, status, "creatorId", "createdAt"
FROM task_service.tasks
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Notifications**

```sql
SELECT id, "userId", title, read, "createdAt"
FROM notification_service.notifications
ORDER BY "createdAt" DESC
LIMIT 20;
```

---

## Railway deployment checklist (same database)

### Postgres (all of auth, tasks, notifications)

Set referenced variables so each service receives:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`

(Use Railway **Reference** to the Postgres plugin variables.)

### Web (`@challenge/web`)

- `VITE_API_URL=https://<api-gateway-public-url>`
- `VITE_WEBSOCKET_URL=https://<notifications-public-url>`

### API gateway

- `AUTH_SERVICE_HOST`, `AUTH_SERVICE_PORT`
- `TASKS_SERVICE_HOST`, `TASKS_SERVICE_PORT`
- `JWT_SECRET` (aligned with auth/notifications)
- `CORS_ORIGINS=https://challengeweb-production.up.railway.app` (or your real web URL)

### Tasks and notifications

- `RABBITMQ_URI` (Railway RabbitMQ or shared broker)

---

## Related files

- `.env.railway.example` — placeholders only
- `.env.railway.local` — your secrets (gitignored)
- `docker-compose.railway-db.yml` — override for Railway `DB_*`
- `scripts/dev-backend-railway-db.sh` — validates env and starts the stack
- `LOCAL_WITH_RAILWAY_DB.md` — supplementary notes; this doc is the primary entry
