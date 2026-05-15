# Database connection report

This document summarizes how PostgreSQL is wired in this repository from configuration and Docker Compose definitions. Runtime health was not executed as part of this write-up.

---

## 1. Current database architecture

- A **single PostgreSQL instance** serves the backend.
- Logical isolation uses **three PostgreSQL schemas**: `auth_service`, `task_service`, `notification_service` (created at first DB bootstrap via `init.sql`).
- **TypeORM** is the ORM for every service that touches the database.
- The **API gateway** exposes HTTP to the frontend and talks to Auth and Tasks over TCP; it **does not open a PostgreSQL connection**.

---

## 2. PostgreSQL Docker service configuration

| Item | Value |
|------|--------|
| Compose service name | `db` |
| Image | `postgres:17.5-alpine3.21` |
| Container name | `db` |
| Host port mapping | `5432:5432` |
| Init script volume | `./init.sql` mounted to `/docker-entrypoint-initdb.d/init.sql` (runs only on fresh data volume) |
| Data persistence | Named volume `postgres_data` |
| Health check | `pg_isready -U postgres` |

---

## 3. Database name, user, password, host, and port

| Variable / role | In Docker Compose (`db` service defaults) | In-app env (Compose injects into DB-using services) |
|-----------------|--------------------------------------------|--------------------------------------------------------|
| Database | `challenge_db` (`POSTGRES_DB`) | `DB_NAME=challenge_db` |
| User | `postgres` (`POSTGRES_USER`) | `DB_USER=postgres` |
| Password | `password` (`POSTGRES_PASSWORD`) | `DB_PASS=password` |
| Host (inside Compose network) | N/A | `DB_HOST=db` |
| Host (from your Mac when port is published) | `localhost` | `DB_HOST=localhost` if you run Nest on the host |
| Port | `5432` | `DB_PORT=5432` |

**Security note:** These are development defaults. Do not reuse them in production without rotation and secrets management.

---

## 4. Existing database schemas

Defined in `init.sql`:

| Schema name | Purpose |
|-------------|---------|
| `auth_service` | Auth service entities / migrations |
| `task_service` | Tasks service (tasks, comments, history, etc.) |
| `notification_service` | Notifications service |

Each schema is granted to `postgres`.

---

## 5. Which services connect to PostgreSQL

| Service | Connects | Mechanism |
|---------|----------|-----------|
| `auth-service` | Yes | `TypeOrmModule.forRoot(dataSourceOptions)` → `apps/auth-service/db/datasource.ts` |
| `tasks-service` | Yes | Same pattern → `apps/tasks-service/db/datasource.ts` |
| `notifications-service` | Yes | Same pattern → `apps/notifications-service/db/datasource.ts` |
| `api-gateway` | No | No TypeORM / no `DB_*` in `docker-compose.yml` |
| `web` (frontend) | No | Browser talks to HTTP API only |

---

## 6. Environment variables used by each service

### Services with PostgreSQL (from `docker-compose.yml`)

Shared pattern: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`.

| Compose service | DB-related env | Additional relevant env |
|----------------|----------------|--------------------------|
| `auth-service` | `DB_*` set to `db` / `5432` / `postgres` / `password` / `challenge_db` | `TCP_PORT`, `HTTP_PORT`, `JWT_SECRET`, `NODE_ENV` |
| `tasks-service` | same `DB_*` | `RABBITMQ_URI`, `TCP_PORT`, `HTTP_PORT`, `NODE_ENV` |
| `notifications-service` | same `DB_*` | `RABBITMQ_URI`, `PORT`, `JWT_SECRET`, `NODE_ENV` |

### `apps/*/db/datasource.ts` fallbacks

If `DB_*` are unset, datasource files fall back roughly to:

- `host`: `localhost`
- `port`: `5432`
- `username`: `postgres`
- `password`: empty string (`''`)
- `database`: `postgres` (differs from `challenge_db`; **always set env in Docker Compose, which already does.**)

---

## 7. Whether migrations are configured

Yes.

- Each DB-owning Nest app exposes TypeORM CLI via `npm run typeorm -- -d db/datasource.ts` (see workspace `package.json` scripts).
- `migrationsRun` is **`false`** in datasource options; migrations are intended to run via CLI or compose startup commands.
- `docker-compose.yml` **`command`** for `auth-service`, `tasks-service`, and `notifications-service` runs `npm run migration:run --workspace=@challenge/<service>` **before** `start:dev`, so containers apply migrations on startup.

---

## 8. Migration commands available

Per `@challenge/auth-service`, `@challenge/tasks-service`, `@challenge/notifications-service` (same script names):

| Script | Meaning |
|--------|---------|
| `migration:generate` | Build then generate migration from entity diff |
| `migration:create` | Wrapper around generate with `$npm_config_name` |
| `migration:run` | Apply pending migrations |
| `migration:revert` | Revert last migration |
| `migration:show` | Show migration status |

Example (from repo root, host with Node):

```bash
npm run migration:run --workspace=@challenge/auth-service
```

In Docker:

```bash
docker compose exec auth-service npm run migration:run --workspace=@challenge/auth-service
```

---

## 9. Whether Docker Compose already starts the database correctly

From configuration review:

- The `db` service defines **health checks**, `POSTGRES_*` defaults, **`init.sql`**, and **`depends_on`** from consumers with `condition: service_healthy` where applicable.
- This is **the intended hackathon-local path**: Postgres comes up first; services wait; migrations then apps start.

Operational success still depends on **Docker/Colima running**, free **host port `5432`**, and sufficient resources for first-time image pull and build.

---

## 10. Exact commands to run the project locally

**Infra + backend stack (without bundled `web` container), from repo root:**

```bash
npm run dev:backend
```

(or equivalent: `bash scripts/dev-backend.sh` — starts Colima if needed per script, then `docker compose up` for DB, RabbitMQ, Auth, Tasks, Notifications, Gateway.)

**Frontend:**

```bash
npm run dev:frontend
```

**Full stack matching README style (includes `web` in compose):**

```bash
docker compose up -d --build
```

**Optional seed:**

```bash
npm install
npm run seed
```

---

## 11. Exact commands to verify database connection

### A. Postgres container health

```bash
docker compose ps db
docker inspect --format '{{.State.Health.Status}}' db
```

Expect `healthy` when Compose health check passes.

### B. Reachability from host

```bash
docker compose exec db psql -U postgres -d challenge_db -c "SELECT version();"
```

### C. Schemas exist

```bash
docker compose exec db psql -U postgres -d challenge_db -c "\\dn"
```

Expect `auth_service`, `task_service`, `notification_service`.

### D. Migration tables per schema (after services started once)

Each service uses schema-qualified tables; migrations table name is `migrations` in that schema (see each `datasource.ts`).

---

## 12. Common database errors and fixes

| Symptom | Likely cause | Fix |
|---------|---------------|-----|
| `Cannot connect to the Docker daemon` | Docker / Colima not running | `colima start` or open Docker Desktop; confirm `docker info` works |
| `connection refused` to `5432` | `db` not up or wrong host | Ensure `docker compose ps` shows `db` healthy; use `DB_HOST=db` in Compose, `localhost` on host |
| `password authentication failed` | Wrong `DB_USER`/`DB_PASS` | Match Compose: `postgres` / `password` unless you changed env |
| Migrations fail on first boot | Postgres not ready or schema missing | Wait for healthy `db`; ensure `init.sql` ran (new volume); check service logs |
| Port `5432` already in use | Local Postgres / another stack | Stop conflicting service or remap host port in `docker-compose.yml` (would be a deliberate config change) |
| Tables missing | Migrations never ran | Check container log for `migration:run`; run migration commands manually (section 8) |

---

## 13. Whether Supabase is needed or not

**No.** This project targets **self-hosted PostgreSQL** via Docker Compose with explicit schemas and TypeORM migrations. **Supabase is not required for the current hackathon stage** if you run Postgres as documented here.

Supabase remains optional only if you **choose** to move hosting to managed Postgres/auth later—that would be an architectural pivot, not a requirement of the present setup.

---

## 14. Recommended next step

1. Run **`npm run dev:backend`** until all services report healthy.
2. Run verification commands in **section 11** once.
3. Run **`npm run dev:frontend`** and exercise login / Kanban through the gateway.

---

## Code review note (non-blocking)

No source changes were applied for this report. Each `db/datasource.ts` calls `dataSource.initialize()` at module load alongside NestJS `TypeOrmModule.forRoot`. If you ever see duplicated connection warnings, that interaction would merit a targeted review; it does not negate that **PostgreSQL connectivity is intentionally configured via `DB_*` and Docker Compose.**
