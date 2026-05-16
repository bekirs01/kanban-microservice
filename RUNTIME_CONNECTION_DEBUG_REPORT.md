# Runtime connection debug report

This report was produced by **static inspection only** (no source edits, no env changes, no package installs, no `docker compose down -v`). It explains how the running frontend and backend are wired and why data you see in the browser might not match what you see in a SQL session.

---

## Executive summary

| Layer | What connects to what |
|-------|------------------------|
| **Browser UI** | Reads `VITE_*` at **Vite dev/build** time from `apps/web/.env` (and falls back in code). HTTP API base is **`http://localhost:3001`** → that is the **API Gateway** on the host (Compose publishes gateway port **3001**). |
| **API Gateway** | Forwards REST to **auth-service** and **tasks-service** over **TCP** (`AUTH_SERVICE_HOST` / `TASKS_SERVICE_HOST` = Docker service names). |
| **Auth / Tasks / Notifications** | Connect to PostgreSQL using Compose env: **`DB_HOST=db`**, **`DB_PORT=5432`**, **`DB_NAME=challenge_db`** inside the Docker network. |
| **DBeaver on your Mac** | Must use the **published** host port mapped to the **`db`** container. In the inspected `docker-compose.yml`, Postgres is published as **`5433:5432`** (host **5433** → container **5432**). If you run `psql` against **`localhost:5432`**, you may be talking to a **different** Postgres (e.g. Postgres.app or another install), not the Compose `db` volume. |

There is **no** `apps/web/src/config/` directory in this repo. API URL is defined in **`apps/web/.env`**, **`apps/web/src/services/api.ts`**, and **`apps/web/src/hooks/useWebSocket.ts`**.

---

## Answers to required questions

### 1. Which API URL does the frontend use?

- **Configured:** `apps/web/.env` sets `VITE_API_URL=http://localhost:3001`.
- **Code:** `apps/web/src/services/api.ts` uses `import.meta.env.VITE_API_URL` with fallback **`http://localhost:3001`**.

So the SPA calls the **API Gateway** at **`http://localhost:3001`** (path prefix `/api/...` on that host).

### 2. Does the frontend call localhost:3001, localhost:3000, the Docker gateway, or something else?

- **localhost:3001** — that is the expected HTTP base URL for REST (gateway). The browser runs on the host; **published** port **3001** is mapped to the **`api-gateway`** container.
- **localhost:3000** — used for the **Vite dev server / web UI** (`web` service or `npm run dev --workspace=@challenge/web`), **not** as `VITE_API_URL`. You open the app at **3000**; API requests go to **3001** unless you change `VITE_API_URL`.
- **Docker internal names** (`api-gateway`, `auth-service`) are **not** used in the browser; the browser only knows **localhost** + host ports.

`docker-compose.yml` **`web`** service sets `VITE_API_URL=http://localhost:3001` in the **container env** if you run the web app via Compose; the checked-in **`apps/web/.env`** matches that for local `npm run dev:frontend`.

### 3. Which backend process is expected to receive register / login / task requests?

| HTTP path (concept) | Receives HTTP | Forwards to (Nest microservice) |
|---------------------|---------------|-----------------------------------|
| `POST /api/auth/register`, `POST /api/auth/login`, … | **api-gateway** (`apps/api-gateway`) | **auth-service** via TCP pattern `auth.register`, `auth.login` |
| `POST /api/tasks`, `PATCH /api/tasks/:id`, … | **api-gateway** | **tasks-service** via TCP patterns like `task.create`, `task.update` |

So the **first** process that sees HTTP from the browser is **`api-gateway`**. Persistence for users is done by **auth-service** → PostgreSQL **`auth_service.users`**.

### 4. Which database does each backend connect to?

From **`docker-compose.yml`** (inspected):

| Service | `DB_HOST` | `DB_PORT` | `DB_NAME` | `DB_USER` | `DB_PASS` (field name in compose) |
|---------|-----------|-----------|-----------|-----------|-------------------------------------|
| auth-service | `db` | `5432` | `challenge_db` | `postgres` | `password` |
| tasks-service | `db` | `5432` | `challenge_db` | `postgres` | `password` |
| notifications-service | `db` | `5432` | `challenge_db` | `postgres` | `password` |

The **`db`** service defines **`POSTGRES_DB=challenge_db`**, **`POSTGRES_USER=postgres`**, **`POSTGRES_PASSWORD=password`**.

**api-gateway** and **web** have **no** `DB_*` variables in Compose — they **do not** open a Postgres connection in this layout.

### 5. Can Docker backend and local `npm` backend conflict?

Yes, in several ways (conceptual, not a code change):

- **`npm run dev:backend`** (see `scripts/dev-backend.sh`) starts **only** Compose services: `db`, `rabbitmq`, `auth-service`, `tasks-service`, `notifications-service`, `api-gateway`. It does **not** start `web`.
- If you separately run **`npm run dev --workspace=@challenge/auth-service`** (or similar) **on the host** **without** the same `DB_*` as Compose, each service’s `apps/*/db/datasource.ts` falls back to **`localhost`**, **`5432`**, **`postgres`** database (note: default DB name differs from `challenge_db`), **`password: ''`** when `DB_PASS` is unset — so you can easily hit **another Postgres** or fail auth while Dockerized services use **`db:5432`** and `challenge_db`.
- Two processes cannot bind the same host port; if both try to use **3001** for gateway, one fails.

### 6. Is port 5432 still used anywhere?

Yes:

- **Inside** the **`db`** container, PostgreSQL listens on **5432** (standard).
- **Between** backend containers and **`db`**, connection string uses **`DB_PORT=5432`** (`db:5432`).
- **On the host**, something else might also listen on **5432** (e.g. native PostgreSQL) — unrelated to Docker’s internal 5432.

The inspected `docker-compose.yml` maps **`5433:5432`** for **`db`**, so on the **host**, **5432** is **not** the Compose Postgres unless you changed the file differently elsewhere.

### 7. Is port 5433 only for DBeaver?

**5433** is the **host-side** port published by Docker for the **`db`** service (`5433:5432`). **Any** client on the host can use it — DBeaver, **`psql`**, GUI tools, or a **host-run** Node script if you set `PGPORT=5433`. It is **not** used by backend containers inside Compose (they use **`db:5432`**).

### 8. Why may new users not appear in `docker compose exec db psql ...`?

Common causes (diagnostic, not exhaustive):

1. **Wrong Postgres instance** — You query **host:5432** (another server) while the app uses **`db`** via the **`postgres_data`** volume. Use **`docker compose exec db`** (always the Compose DB) **or** `localhost:5433` if that matches your published map.
2. **Wrong schema** — Users live in **`auth_service.users`**, not `public.users`. Query:  
   `SELECT * FROM auth_service.users;`
3. **Frontend not pointing at Docker gateway** — If `VITE_API_URL` were set to a **remote** URL (e.g. cloud/Railway) at build time, registration would write to **that** stack’s database, not your local Docker volume.
4. **Transaction / migration / sync mismatch** — If a different environment created the row, your local DB would not show it.

### 9. Exact commands to prove which API receives requests

```bash
# From the repo root — gateway health (should return JSON)
curl -sS http://localhost:3001/api/health

# See which process holds port 3001 (macOS/Linux)
lsof -i :3001
# or
ss -lntp | grep 3001
```

In **Chrome DevTools → Network**, filter **`/api/`** and confirm request URL host: **`localhost`** and port **`3001`** (unless you overrode `VITE_API_URL` at build).

```bash
# Optional: follow gateway logs while you click Register in the UI
docker compose logs -f api-gateway
```

### 10. Exact commands to inspect the **real** database used by Docker backends

Always hit the **`db`** container’s Postgres (same volume Compose uses):

```bash
cd /path/to/kanban-microservice-main

# List users in the schema the app uses
docker compose exec db psql -U postgres -d challenge_db -c \
  'SELECT id, email, username, "createdAt" FROM auth_service.users ORDER BY "createdAt" DESC LIMIT 20;'
```

From the **host** (matches **`5433:5432`** in the inspected compose file):

```bash
psql "postgresql://postgres:password@localhost:5433/challenge_db" \
  -c 'SELECT id, email FROM auth_service.users LIMIT 10;'
```

If **`psql`** is not installed, use **`docker compose exec db`** only.

### 11. Safest fix so frontend, backend, and DBeaver use the same PostgreSQL

1. **One stack** — Run backends via **`npm run dev:backend`** **or** full **`docker compose up`**, not a mix of host-run Nest and Docker Nest unless you **export identical `DB_*`** for host processes (including **host port** `5433` for Postgres if connecting from host to Docker DB).
2. **Frontend** — Keep **`apps/web/.env`** `VITE_API_URL=http://localhost:3001` **while** gateway is the Compose gateway on **3001**.
3. **DBeaver** — Connection: **localhost**, port **5433** (per current **`5433:5432`** mapping), database **challenge_db**, user **postgres**, password **password**; browse schemas **`auth_service`**, **`task_service`**, **`notification_service`**.
4. **Verify** — After a registration, run the **`docker compose exec db ... auth_service.users`** query above; if empty, your browser is not using the same API/DB chain (re-check Network tab and `curl` health).

---

## Files inspected (reference)

| Area | Finding |
|------|---------|
| `apps/web/.env` | `VITE_API_URL=http://localhost:3001`, `VITE_WEBSOCKET_URL=http://localhost:3004` |
| `apps/web/.env.example` | Same |
| `apps/web/vite.config.ts` | Dev server host/port only; **no** API URL |
| `apps/web/src/services/api.ts` | `API_URL` from `VITE_API_URL` / fallback `http://localhost:3001` |
| `apps/web/src/hooks/useWebSocket.ts` | `VITE_WEBSOCKET_URL` / fallback `http://localhost:3004` |
| `apps/web/src/config/*` | **Directory does not exist** in repo |
| `apps/web/src/lib/*` | No API base URL found in `utils.ts` / `schemas.ts` / `taskDetailUtils.ts` (not re-pasted here; inspection showed no `VITE_` / `axios` base URL) |
| `apps/api-gateway/.env*` | **No** `.env` files under `apps/api-gateway/` |
| `apps/auth-service/.env*` | **None** |
| `apps/tasks-service/.env*` | **None** |
| `apps/notifications-service/.env*` | **None** |
| `docker-compose.yml` | Gateway **3001**; backends **`DB_HOST=db`**, **`DB_PORT=5432`**; **`db`** ports **`5433:5432`** |
| `package.json` (root) | `dev:backend` → `scripts/dev-backend.sh`; `dev:frontend` → `scripts/dev-frontend.sh` |
| `scripts/dev-backend.sh` | Starts **db**, rabbitmq, auth, tasks, notifications, api-gateway (not `web`) |
| `scripts/dev-frontend.sh` | Ensures `apps/web/.env` exists, runs **web** dev |

API base URLs elsewhere: **`README.md`**, **`LOCAL_RUN_STATUS_REPORT.md`**, **`RAILWAY_DEPLOY_RU.md`** mention localhost or cloud URLs in documentation only.

**Root `scripts/seed.ts`** reads **`dotenv.config` from `../.env`** (repo root `.env`). **No** root `.env` is present in the repository listing—if you run **`npm run seed`**, DB connection depends on env you create locally (defaults in seed: `localhost:5432`, `challenge_db`, password `password` per script).

---

## Diagram (runtime)

```
Browser (http://localhost:3000 — Vite UI)
  │  axios baseURL = VITE_API_URL → http://localhost:3001
  ▼
host:3001 → api-gateway (Docker)
  │  Nest TCP clients
  ├──► auth-service (db:5432 / challenge_db / auth_service schema)
  └──► tasks-service (db:5432 / challenge_db / task_service schema)
         └──► RMQ ──► notifications-service (db:5432 / notification_service schema)

DBeaver on laptop → localhost:5433 → db container :5432 (published map)
```

---

## Recommended next checks (operator)

1. **`curl -s http://localhost:3001/api/health`** — confirms gateway and stack.
2. **`docker compose exec db psql -U postgres -d challenge_db -c '\dn'`** — confirms schemas.
3. **User rows:** `SELECT count(*) FROM auth_service.users;` inside **`exec db psql`**.
4. If count is **zero** but UI “works”, compare browser **Network** request URL to **`localhost:3001`** and ensure you are not on a **deployed** API URL baked into an old production build.
