# Railway runtime connection plan

This document explains why **Railway PostgreSQL** and **local Docker PostgreSQL** are separate systems, what must be configured for **`https://challengeweb-production.up.railway.app/kanban`** to persist data in **Railway’s** database, and what to verify without connecting Railway to your Mac or exposing local Postgres.

**Scope of this write-up:** inspection and planning only (no application code edits in this step).

---

## 1. Why local Docker PostgreSQL and Railway PostgreSQL are different databases

- **Local Docker `db`**: runs in your machine’s (or Colima’s) Docker engine, data in a **local named volume** (`postgres_data` in `docker-compose.yml`). Host access is typically `127.0.0.1:5433` (per current port mapping) or `docker compose exec db psql …`.
- **Railway PostgreSQL**: runs in **Railway’s infrastructure**, on a different host, with **different connection strings**, credentials, and storage. It is **not** the same disk or the same `postgres_data` volume.

The browser and deployed backends have **no path** to your laptop’s `127.0.0.1:5433` unless you deliberately tunnel or expose it—which you must **not** do for this architecture.

---

## 2. Why a deployed Railway app cannot write to `127.0.0.1:5433` on your Mac

- **`127.0.0.1` / `localhost`** always means “this machine”—from a **Railway container**, that is the **container itself**, not your Mac.
- Your Mac’s Postgres is **not** reachable on the public internet unless you port-forward or expose it (unsafe and out of scope).

So Railway **auth-service** / **tasks-service** / **notifications-service** must use **`DB_HOST`** (and related vars) pointing to **Railway’s Postgres** (`*.railway.internal` / proxy host / `DATABASE_URL` provided by Railway), never `127.0.0.1` on your machine.

---

## 3. Which Railway services are required

| Role | Railway service (example naming) | Purpose |
|------|----------------------------------|---------|
| Frontend | `@challenge/web` (or equivalent) | Serves static/Vite app; must be built with **correct `VITE_*`** for production API/WS URLs. |
| API Gateway | `@challenge/api-gateway` | HTTP REST for browser; TCP to auth/tasks. |
| Auth | `@challenge/auth-service` | Register/login; **`auth_service`** schema in Postgres. |
| Tasks | `@challenge/tasks-service` | Tasks CRUD, history; **`task_service`** schema; publishes to RabbitMQ. |
| Notifications | `@challenge/notifications-service` | Consumes RMQ, persists notifications, Socket.IO. |
| Database | **Postgres** (Railway plugin or template) | Single logical DB; schemas created via migrations/init as in repo. |
| Broker | **RabbitMQ** (container/image or managed equivalent) | Required for tasks → notifications pipeline and consumer in notifications-service. |

If RabbitMQ is missing or misconfigured, core **HTTP** flows may still work for auth/tasks **if** only TCP+DB paths are used, but **notification-driven** paths and RMQ health may fail; the repo expects **RabbitMQ** for the designed architecture.

---

## 4. Railway environment variables required — by service (conceptual)

- **web**: Build-time / runtime **`VITE_API_URL`**, **`VITE_WEBSOCKET_URL`** (HTTPS/WSS public URLs of gateway and notifications).
- **api-gateway**: **`PORT`**, **`JWT_SECRET`**, **`AUTH_SERVICE_HOST`**, **`AUTH_SERVICE_PORT`**, **`TASKS_SERVICE_HOST`**, **`TASKS_SERVICE_PORT`**, **`CORS_ORIGINS`** (deployed web origin).
- **auth-service**: **`TCP_PORT`**, **`HTTP_PORT`**, **`JWT_SECRET`**, all **`DB_*`** for Railway Postgres; **`RAILWAY_DOCKERFILE_PATH`** if using monorepo Dockerfile.
- **tasks-service**: **`TCP_PORT`**, **`HTTP_PORT`**, **`RABBITMQ_URI`**, **`DB_*`**.
- **notifications-service**: **`PORT`**, **`JWT_SECRET`**, **`RABBITMQ_URI`**, **`DB_*`**.

Use **Railway Reference variables** to inject the Postgres service’s `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (or `DATABASE_URL`) into each backend service so credentials stay consistent.

---

## 5. What `VITE_API_URL` must be in the deployed frontend

**The public HTTPS URL of the API Gateway**, e.g.:

`https://<your-api-gateway-production-domain>.up.railway.app`

**Not** `http://localhost:3001`. Vite bakes `import.meta.env.VITE_*` at **build time**; setting variables only at runtime without rebuilding the web artifact does not change an already-built bundle.

---

## 6. What `VITE_WEBSOCKET_URL` must be in the deployed frontend

**The public HTTPS URL of the notifications service** (Socket.IO is served over the same HTTP server in this codebase), e.g.:

`https://<your-notifications-service-production-domain>.up.railway.app`

Browser WebSocket will use **WSS** over that origin. **Not** `http://localhost:3004`.

---

## 7. What `DB_*` must point to on Railway backends

| Variable | Meaning on Railway |
|----------|---------------------|
| `DB_HOST` | Railway Postgres **private hostname** (e.g. `*.railway.internal`) or host from `DATABASE_URL` / dashboard |
| `DB_PORT` | Railway Postgres port (often **`5432`** for internal connection) |
| `DB_NAME` | Railway database name (often `railway` unless you created another) |
| `DB_USER` / `DB_PASS` | From Railway Postgres service variables |

These **must** match the **same** Railway Postgres instance you intend to inspect. They must **not** reference `localhost` or your Mac.

---

## 8. How to connect DBeaver to Railway PostgreSQL

1. In Railway dashboard → **Postgres** service → **Variables** (or Connect).
2. Use **public** connection if offered (e.g. **`DATABASE_PUBLIC_URL`** or TCP proxy host + port), or **private** networking tools per Railway docs.
3. Typical fields: **host** (proxy or public hostname), **port**, **database**, **user**, **password** — copy from Railway’s UI, not from local `docker-compose.yml`.

**Never** use `127.0.0.1:5433` for Railway data—that is **local Docker** only.

---

## 9. How to verify Railway register/login writes into Railway PostgreSQL

1. Register a user in the **deployed** UI at the production URL.
2. In Railway → Postgres → **Query** (or DBeaver connected to **Railway** Postgres):
   ```sql
   SELECT id, email, "createdAt"
   FROM auth_service.users
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```
3. Confirm the email appears with a fresh `createdAt` timestamp.
4. Optionally: `curl -sS https://<gateway>/api/health` from your machine to confirm gateway points at the same stack.

---

## 10. How to verify local Docker still works separately

1. Run **`docker compose up -d`** (or `npm run dev:backend` + `npm run dev:frontend`) on your machine.
2. Use **`http://localhost:3000`** and **`http://localhost:3001`** (from `apps/web/.env`).
3. Query **local** DB: `docker compose exec db psql …` or DBeaver **`127.0.0.1:5433`**.

Local and Railway data sets will **diverge** unless you manually sync them—this is expected.

---

## 11. Safest next step

**Single action:** In Railway, for the **`@challenge/web`** service, set **`VITE_API_URL`** and **`VITE_WEBSOCKET_URL`** to the **exact public HTTPS URLs** of **`api-gateway`** and **`notifications-service`**, then **trigger a redeploy/rebuild** of the web service so the bundle contains those values. In parallel, confirm **every backend** service’s **`DB_*`** references the **Railway Postgres** service (Reference variables), not defaults that resolve to internal `localhost` inside the container.

---

## Repository readiness for Railway (inspection summary)

### Hardcoded / risky `localhost` usage

| Location | Issue |
|----------|--------|
| `apps/web/src/services/api.ts` | Fallback `http://localhost:3001` — wrong if production build omits `VITE_API_URL`. |
| `apps/web/src/hooks/useWebSocket.ts` | Fallback `http://localhost:3004` — same for WebSocket. |
| `apps/web/.env` | `localhost` — correct **only** for local dev; must not be the only source for Railway **build**. |
| `apps/auth-service/db/datasource.ts` (and tasks, notifications) | Fallback `host: 'localhost'` for `DB_HOST` — in Railway, **must** set `DB_HOST` or service connects to wrong target. |
| `apps/tasks-service/src/task/task.module.ts` | **`urls: ["amqp://admin:admin@localhost:5672"]` hardcoded** — **ignores `RABBITMQ_URI`** for the Nest RMQ client registration. Queue name **`notification_queue`**. |
| `apps/tasks-service/src/comment/comment.module.ts` | Same hardcoded AMQP URL; same queue name. |
| `apps/tasks-service/src/main.ts` | Uses `process.env.RABBITMQ_URI || 'amqp://...@localhost:5672'` (OK if env set). |
| `apps/notifications-service/src/main.ts` | Same pattern for consumer; queue **`notifications_queue`**. |
| `apps/api-gateway/src/auth/auth.module.ts`, `tasks.module.ts`, `users.module.ts` | Fallback `localhost` for TCP clients — **must** set `AUTH_SERVICE_HOST` / `TASKS_SERVICE_HOST` on Railway. |

### CORS (`apps/api-gateway/src/main.ts`)

- Default origins include **localhost** Vite ports; production origin must be added via **`CORS_ORIGINS`**, e.g. `https://challengeweb-production.up.railway.app` (or `*` only if acceptable for your demo policy).

### WebSocket CORS (`notifications.gateway.ts`)

- `@WebSocketGateway({ cors: { origin: '*' } })` — permissive; not the typical blocker; browser still needs correct **`VITE_WEBSOCKET_URL`**.

### Datasource / DB

- **`synchronize: true`** in all three `db/datasource.ts` files — convenient for demos but can mask migration drift; Railway DB name often **`railway`** vs local **`challenge_db`** — **`DB_NAME`** must match the actual database.

### RabbitMQ queue name inconsistency (critical for events)

- **tasks-service** `task.module.ts` / `comment.module.ts` register queue **`notification_queue`**.
- **notifications-service** `main.ts` subscribes to **`notifications_queue`**.
- Unless RabbitMQ bridges these, **task/comment events may not reach the notifications consumer**. This is independent of Postgres but breaks the full stack.

### Exact code changes recommended (for a follow-up PR; **not applied** in this document)

1. **`apps/tasks-service/src/task/task.module.ts`**: Use `process.env.RABBITMQ_URI` (split/array as Nest expects) instead of hardcoded `localhost:5672`; align **`queue`** name with **`notifications_queue`** in `notifications-service/src/main.ts`.
2. **`apps/tasks-service/src/comment/comment.module.ts`**: Same as above.
3. **Railway web build**: Ensure **`VITE_API_URL`** / **`VITE_WEBSOCKET_URL`** are set **before** `npm run build` (Docker build args or Railway variables for build).
4. **api-gateway**: Set **`CORS_ORIGINS`** to the deployed web origin(s).

---

## Required Railway Environment Variables

Placeholders `<…>` must be replaced with values from your Railway project (Reference syntax supported, e.g. `${{Postgres.PGHOST}}` per Railway docs).

### Web (`@challenge/web`)

```env
VITE_API_URL=https://<deployed-api-gateway-domain>
VITE_WEBSOCKET_URL=https://<deployed-notifications-service-domain>
NODE_ENV=production
PORT=3000
RAILWAY_DOCKERFILE_PATH=apps/web/Dockerfile
```

### API Gateway (`@challenge/api-gateway`)

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=<same-secret-as-auth-and-notifications>
AUTH_SERVICE_HOST=<railway-private-domain-for-auth-service>
AUTH_SERVICE_PORT=3002
TASKS_SERVICE_HOST=<railway-private-domain-for-tasks-service>
TASKS_SERVICE_PORT=3003
CORS_ORIGINS=https://challengeweb-production.up.railway.app
RAILWAY_DOCKERFILE_PATH=apps/api-gateway/Dockerfile
```

### Auth service

```env
TCP_PORT=3002
HTTP_PORT=3012
JWT_SECRET=<same-secret>
JWT_REFRESH_SECRET=<match-auth-jwt-config-if-used>
DB_HOST=<railway-postgres-host>
DB_PORT=<railway-postgres-port>
DB_USER=<railway-postgres-user>
DB_PASS=<railway-postgres-password>
DB_NAME=<railway-postgres-database>
RAILWAY_DOCKERFILE_PATH=apps/auth-service/Dockerfile
```

### Tasks service

```env
TCP_PORT=3003
HTTP_PORT=3013
RABBITMQ_URI=<railway-rabbitmq-amqp-url>
DB_HOST=<railway-postgres-host>
DB_PORT=<railway-postgres-port>
DB_USER=<railway-postgres-user>
DB_PASS=<railway-postgres-password>
DB_NAME=<railway-postgres-database>
RAILWAY_DOCKERFILE_PATH=apps/tasks-service/Dockerfile
```

### Notifications service

```env
PORT=3004
JWT_SECRET=<same-secret>
RABBITMQ_URI=<railway-rabbitmq-amqp-url>
DB_HOST=<railway-postgres-host>
DB_PORT=<railway-postgres-port>
DB_USER=<railway-postgres-user>
DB_PASS=<railway-postgres-password>
DB_NAME=<railway-postgres-database>
RAILWAY_DOCKERFILE_PATH=apps/notifications-service/Dockerfile
```

---

## Important conclusion

- **Production / deployment:** DBeaver must use **Railway’s Postgres connection** (from the Railway dashboard). **`127.0.0.1:5433`** only shows **local Docker** data.
- **Deployed web** must call **public https** gateway and notifications URLs via **`VITE_*`** baked into the build.
- **Backends** must use Railway **`DB_*`** (and **`RABBITMQ_URI`**) — never your Mac’s loopback.

---

## What is wrong with the current deployment if users/tasks do not appear in Railway DB

Typical causes (checklist):

1. **Web build** still has **`VITE_API_URL=http://localhost:3001`** → browser talks to **nothing** or to **your laptop** (if somehow reachable), not Railway gateway → writes go to wrong place or fail silently in network tab.
2. **`DB_NAME`** on Railway is **`railway`** but you inspect **`challenge_db`** in DBeaver (or vice versa).
3. **Backends** missing **`DB_HOST`** → TypeORM falls back to **`localhost`** inside the container (empty/wrong DB).
4. **CORS** blocks browser → requests never hit gateway (check DevTools).
5. **Queue / RMQ** misconfiguration: tasks module **hardcodes** localhost RabbitMQ → notifications path broken (separate from Postgres but confuses debugging).

---

## Recommended DBeaver connection (Railway Postgres only)

| Field | Source |
|-------|--------|
| Host / Port | From Railway Postgres **Connect** / **DATABASE_PUBLIC_URL** (or private VPN instructions) |
| Database | Value in **`PGDATABASE`** / URL (often `railway`) |
| User / Password | **`PGUSER`** / **`PGPASSWORD`** from Railway |

Never use local **`127.0.0.1:5433`** for this purpose.
