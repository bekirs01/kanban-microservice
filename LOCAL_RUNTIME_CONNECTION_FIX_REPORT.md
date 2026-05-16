# Local runtime connection fix report

Generated after verifying configuration and running a full Compose stack, health checks, API smoke tests, and PostgreSQL queries. No Docker volumes were removed, no `docker compose down -v`, no data wipe.

---

## 1. What was wrong

**Repository configuration was already correct** for the intended wiring:

- `docker-compose.yml` maps **`db`** as **`5433:5432`**, backends use **`DB_HOST=db`**, **`DB_PORT=5432`**, **`DB_NAME=challenge_db`**, **`DB_USER=postgres`**, **`DB_PASS=password`**.
- `apps/web/.env` already had **`VITE_API_URL=http://localhost:3001`** and **`VITE_WEBSOCKET_URL=http://localhost:3004`**.
- `apps/web/src/services/api.ts` and **`useWebSocket.ts`** already use **`import.meta.env.VITE_*`** with the required fallbacks.

Typical causes of “UI shows data but DBeaver does not” (from `RUNTIME_CONNECTION_DEBUG_REPORT.md`) are **operational**:

- DBeaver pointed at **`127.0.0.1:5432`** (another Postgres) instead of **`127.0.0.1:5433`** (Compose **`db`**).
- Or a **non-Compose** frontend/backend stack (e.g. `npm run dev` on host with different `DB_*`) while inspecting the Compose database.
- Or querying **`public`** instead of **`auth_service.users`** / **`task_service.tasks`**.

**Action taken:** ensured the **full Docker stack** is up (`docker compose up -d` for `db`, RabbitMQ, all backends, `api-gateway`, `web`), verified health and end-to-end **register + create task** against **`http://localhost:3001`**, then verified rows in **`challenge_db`** inside container **`db`**.

---

## 2. Which API URL the frontend uses

**`http://localhost:3001`** — from **`apps/web/.env`** (`VITE_API_URL`) and the fallback in **`apps/web/src/services/api.ts`**.

---

## 3. Which database the backend uses

**Single Postgres instance:** Docker service **`db`**, database **`challenge_db`**, **`postgres` / `password`**.  
Backends connect internally at **`db:5432`** (Compose network). Schemas: **`auth_service`**, **`task_service`**, **`notification_service`**.

---

## 4. Which port DBeaver must use

**Host: `127.0.0.1` (or `localhost`), port: `5433`** — maps to container **`5432`** (`5433:5432` in `docker-compose.yml`).

---

## 5. Which services are running

At verification time, **`docker compose ps`** showed **Up (healthy)** for: **`db`**, **`rabbitmq`**, **`auth-service`**, **`tasks-service`**, **`notifications-service`**, **`api-gateway`**, **`web`**.

---

## 6. Whether API Gateway received the register request

**Yes.** Smoke test: **`POST http://localhost:3001/api/auth/register`** returned **`accessToken`**, **`refreshToken`**, and **`user`**. Gateway health: **`curl http://localhost:3001/api/health`** returned **200** with JSON **`"status":"ok"`**.

---

## 7. Whether the test user appeared in `auth_service.users`

**Yes.** Example smoke user:

| Field | Value |
|-------|--------|
| **email** | `runtime_smoke_<timestamp>@example.com` (see DB ordering by `createdAt`) |
| **id** | `518fe5da-d00c-438a-a0e7-d7aa7ff4f7f2` |

Verified with:

`docker compose exec db psql -U postgres -d challenge_db -c 'SELECT id, username, email, "createdAt" FROM auth_service.users ORDER BY "createdAt" DESC LIMIT 10;'`

---

## 8. Whether the test task appeared in `task_service.tasks`

**Yes.** Example task:

| Field | Value |
|-------|--------|
| **title** | `Smoke task <timestamp>` |
| **id** | `7cb0c2dc-d7c4-4cb1-9fa3-e63be7d015bc` |
| **creatorId** | matches smoke user id above |

Verified with:

`docker compose exec db psql -U postgres -d challenge_db -c 'SELECT id, title, status, "creatorId", "createdAt" FROM task_service.tasks ORDER BY "createdAt" DESC LIMIT 10;'`

---

## 9. Exact DBeaver connection settings

| Setting | Value |
|---------|--------|
| Host | `127.0.0.1` |
| Port | `5433` |
| Database | `challenge_db` |
| User | `postgres` |
| Password | `password` |

Browse schemas **`auth_service`**, **`task_service`**, **`notification_service`**.

---

## 10. Exact browser URL to open

**`http://localhost:3000`** — Vite/`web` UI (Compose publishes **`3000:3000`**).

---

## 11. Remaining issues / notes

- **No code or `.env` changes were required**; alignment was already correct in repo files.
- **Port diagnostics (`lsof`)** on the host may show **SSH** or other processes on **3000 / 3001 / 3004 / 5433** in addition to Docker, depending on your setup. Avoid running **two** frontends (Compose **`web`** and **`npm run dev:frontend`**) both binding **3000**, and avoid a second API gateway on **3001** outside Compose while testing.
- Extra test users were created during an earlier multi-register shell attempt (`runtime_test_*@example.com`); they remain in **`auth_service.users`** (no deletion performed).

---

## Commands executed (summary)

```bash
pwd
docker compose ps
lsof -nP -iTCP:3000 -sTCP:LISTEN || true
lsof -nP -iTCP:3001 -sTCP:LISTEN || true
lsof -nP -iTCP:3004 -sTCP:LISTEN || true
lsof -nP -iTCP:5432 -sTCP:LISTEN || true
lsof -nP -iTCP:5433 -sTCP:LISTEN || true

docker compose up -d db rabbitmq auth-service tasks-service notifications-service api-gateway web

docker compose ps
curl -sS http://localhost:3001/api/health

docker compose exec db psql -U postgres -d challenge_db -c '\dn'
docker compose exec db psql -U postgres -d challenge_db -c 'SELECT count(*) FROM auth_service.users;'
docker compose exec db psql -U postgres -d challenge_db -c 'SELECT count(*) FROM task_service.tasks;'

# Then: register + create task via curl (smoke), re-query users/tasks, tail logs
docker compose logs --tail=200 api-gateway
docker compose logs --tail=200 auth-service
docker compose logs --tail=200 tasks-service
```

No process kills were run (only observation).

---

## Expected final result (achieved for smoke test)

- Browser app: **`http://localhost:3000`**
- API: **`http://localhost:3001`**
- Backends → **`db:5432`** / **`challenge_db`**
- DBeaver → **`127.0.0.1:5433`**
- New user in **`auth_service.users`**; new task in **`task_service.tasks`**
