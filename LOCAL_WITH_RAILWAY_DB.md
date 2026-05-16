# Local development with Railway PostgreSQL

**Primary guide:** [ONE_MAIN_DATABASE_SETUP.md](./ONE_MAIN_DATABASE_SETUP.md) — Railway Postgres as the shared main database, DBeaver, verification SQL, and Railway deploy checklist.

This file is a **short supplement** for the same workflow.

## Recommended default (shared DB)

Run:

```bash
npm run dev:railway-db
```

Alias: `npm run dev:backend:railway-db` (same script).

Prerequisites: `.env.railway.local` (copy from `.env.railway.example`) with non-empty `RAILWAY_DB_HOST`, `RAILWAY_DB_PORT`, `RAILWAY_DB_USER`, `RAILWAY_DB_PASS`, `RAILWAY_DB_NAME` from Railway → Postgres.

The stack starts **without** the local `db` container: **rabbitmq**, **auth-service**, **tasks-service**, **notifications-service**, **api-gateway**, **web**. Application data goes to **Railway PostgreSQL** via `docker-compose.railway-db.yml`.

## Optional fallback: local Docker Postgres only

For offline or isolated DB on your machine:

```bash
npm run dev:local-db
```

Uses local `db` at host port **5433** per `docker-compose.yml`. That data is **not** the same as Railway.

## DBeaver

Use **Railway Postgres** public connection values. Do **not** use `127.0.0.1:5433` if you need to see the **shared** database used by Railway deploy + `dev:railway-db`.

## Frontend (local)

`apps/web/.env` keeps **api-gateway** at `http://localhost:3001` and local websocket URLs. Only the **database** is remote in Railway DB mode.

## Safety

- Do not expose local PostgreSQL publicly.
- Do not point Railway at your Mac DB.
- Do not commit `.env.railway.local`.
