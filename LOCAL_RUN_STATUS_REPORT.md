# Local run status report

Generated from automated checks run against this repository on the machine where the commands executed (Docker context: **colima**). No source code was modified. No `docker compose down -v` was run; existing volumes were preserved.

---

## TODO checklist (verification run)

- [x] Confirm current working directory is project root — `pwd` → `/Users/bekirsucikaran/Desktop/kanban-microservice-main`
- [x] Check Docker status — `docker info` succeeded (server Colima, contexts available)
- [x] Start Docker Desktop if Docker is not running — **skipped**: Docker daemon already reachable via Colima (`open -a Docker` not required in this environment)
- [x] Build and start Docker Compose services — `docker compose up -d --build` **exit code 0**
- [x] Check container status — `docker compose ps -a` captured below
- [x] Verify PostgreSQL connection — `docker compose exec db psql …` succeeded
- [x] Verify database schemas — `\dn` lists expected schemas
- [x] Check backend service health/logs — health checks **healthy**; logs show 200 on `/api/health` and microservice `/health`
- [x] Check frontend run instructions — `docker-compose.yml` maps **web** to host **3000**; Vite log inside container confirms `http://localhost:3000/`. README also mentions host `5173` for **local** `npm run dev` (not Docker `web`).
- [x] Create local run status report — this file

---

## 1. Commands executed

```bash
cd /Users/bekirsucikaran/Desktop/kanban-microservice-main
pwd
docker info
docker compose up -d --build
docker compose ps -a
docker compose exec -T db psql -U postgres -d challenge_db -c "\dn"
docker compose logs --tail=100 db
docker compose logs --tail=100 api-gateway
docker compose logs --tail=100 auth-service
docker compose logs --tail=100 tasks-service
docker compose logs --tail=100 notifications-service
docker compose logs --tail=100 web
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

---

## 2. Docker status

| Check | Result |
|-------|--------|
| `docker info` | **OK** — Client Docker Engine Community 29.x; Server Colima linux/aarch64; containers running |
| Docker Desktop | Not used here; daemon provided by **Colima** |

---

## 3. Container status

`docker compose ps -a` (after successful `up`):

| SERVICE | STATUS | HOST PORTS (selected) |
|---------|--------|------------------------|
| `db` | Up (healthy) | 5432 |
| `rabbitmq` | Up (healthy) | 5672, 15672 |
| `auth-service` | Up (healthy) | 3002, 3012 |
| `tasks-service` | Up (healthy) | 3003, 3013 |
| `notifications-service` | Up (healthy) | 3004 |
| `api-gateway` | Up (healthy) | **3001** |
| `web` | Up | **3000** |

*(Compose file service name for RabbitMQ is `rabbitmq`; container name remains `rabbitmq2`.)*

---

## 4. PostgreSQL status

- **`docker compose exec db`** against database **`challenge_db`** as **`postgres`**: succeeded.
- DB logs: cluster **ready to accept connections**; existing data directory (**no re-init**), consistent with preserving volumes.

---

## 5. Existing schemas (`\dn` output)

```
             List of schemas
         Name         |       Owner       
----------------------+-------------------
 auth_service         | postgres
 notification_service | postgres
 public               | pg_database_owner
 task_service         | postgres
```

---

## 6. Backend service status

| Component | Observation |
|-----------|-------------|
| `api-gateway` | Status **healthy**; logs show **`HEAD /api/health` → HTTP 200** |
| `auth-service` | **healthy**; `SELECT 1` and `/health` 200 |
| `tasks-service` | **healthy**; DB `SELECT 1`, RMQ connected, `/health` 200 |
| `notifications-service` | **healthy**; DB `SELECT 1`, RMQ connected, `/health` 200 |
| Host probes | **`curl http://localhost:3001/api/health` → 200** |

---

## 7. Frontend status

| Mode | URL | Verified |
|------|-----|----------|
| **Docker `web` service** (this run) | `http://localhost:3000/` | Vite reports ready; **`curl` → HTTP 200** |
| Host `npm run dev` (see `package.json` `dev:frontend`) | typically `http://localhost:5173/` | Not started in this automated run |

`apps/web` in Compose uses **`VITE_API_URL=http://localhost:3001`** and **`VITE_WEBSOCKET_URL=http://localhost:3004`** — correct for browser on the host calling published ports.

---

## 8. Errors found

**None blocking.** Compose completed with exit code **0**.

---

## 9. Exact fix recommendation for each error

N/A (no failures in this verification pass).

---

## 10. Whether the project is ready to open in browser

**Yes**, for this environment:

- **Database is running** (PostgreSQL container healthy).
- **Backend is running** (gateway + microservices healthy; API health HTTP 200).
- **Frontend (Docker)** is running (Vite on port **3000**; HTTP 200).
- **Supabase is not needed** for this stack (matches `DATABASE_CONNECTION_REPORT.md`).
- **The project is ready for browser testing** at the URLs below.

---

## 11. Exact URLs to open

| Purpose | URL |
|---------|-----|
| **App UI (Docker web)** | **http://localhost:3000/** |
| API docs (Swagger) | **http://localhost:3001/api/docs** |
| RabbitMQ management | http://localhost:15672 (admin / admin) |
| Local Vite-only dev (when not using Docker `web`) | http://localhost:5173/ after `npm run dev:frontend` |

---

## 12. Next recommended step

1. Open **http://localhost:3000/** and exercise login/Kanban.
2. Optionally run **`npm run seed`** from the project root (host Node) while containers are up if you want seeded users/tasks.
3. For ongoing logs without destroying data: `docker compose logs -f api-gateway`.

---

## Reference: README vs Docker frontend port

`README.md` Quick Start lists frontend at **5173**, which aligns with running Vite directly on the host. When using **`docker compose up`**, `docker-compose.yml` exposes the SPA on **3000** — use **`http://localhost:3000/`** unless you deliberately run `npm run dev:frontend` only.
