# RBAC registration approval — ready-to-test report

## Migrations (auth-service)

| Check | Result |
|--------|--------|
| Command | `docker compose --env-file .env.railway.local -f docker-compose.yml -f docker-compose.railway-db.yml exec -T auth-service npm run migration:run --workspace=@challenge/auth-service` |
| Outcome | **No migrations are pending** |
| Latest migrations present (DB) | Includes `RegistrationRequests1747600000600`, `AddUserRole1747500000000`, and prior user-table migrations |

## Database structure (Railway PostgreSQL via auth-service)

| Object | Status |
|--------|--------|
| `auth_service.users.role` | **Present** |
| `auth_service.registration_requests` | **Present** |

## Admin account

| Item | Status |
|------|--------|
| `bekirsucikaran00@gmail.com` → `ADMIN` | **Ensured** (single-row predicate on trimmed normalized email prior to verification; automated check indicated zero admins before promotion) |
| At least one `ADMIN` | **Yes** |

## API Gateway

| Step | Done |
|------|------|
| Stack started | `npm run dev:railway-db` |
| Gateway restart | `docker compose --env-file .env.railway.local -f docker-compose.yml -f docker-compose.railway-db.yml restart api-gateway` |
| Auth + notifications restart | `docker compose restart auth-service notifications-service` |

Routes confirmed in Nest logs:

- `/api/admin/users` (GET, POST)
- `/api/admin/users/:id/role` (PATCH)
- `/api/admin/registration-requests` (GET)
- `/api/admin/registration-requests/:id/approve` | `reject` (POST)

Unauthenticated probes (correct behavior):

- `GET /api/admin/users` → **401** (not 404)
- `POST /api/admin/users` → **401** (not 404 / “Cannot POST”)

## Registration request API

| Check | Result |
|--------|--------|
| `POST /api/auth/register-request` | **201** observed in smoke call |
| Response shape | Returned `{ requestId: "..." }` |
| DB pending row | **Created**; does **not** create `users` until admin approves |

## RabbitMQ notifications

| Environment | `RABBITMQ_URI` |
|-------------|----------------|
| Local stack (auth-service container, Railway DB mode) | **SET** (presence only; value not logged) |
| Railway **production** `@challenge/auth-service` | **`RABBITMQ_URI` absent** in Railway variable list snapshot. **`ADMIN_EMAILS`** present. |

For production realtime notifications: add **`RABBITMQ_URI`** on `@challenge/auth-service` in Railway to mirror the URI used by a service publishing to **`notifications_queue`**, without committing secrets into the repo.

## Builds

Executed successfully:

- `npm run build --workspace=@challenge/types`
- `npm run build --workspace=@challenge/api-gateway`
- `npm run build --workspace=@challenge/auth-service`
- `npm run build --workspace=@challenge/web`

## Automated smoke side effect

One pending `registration_requests` row was inserted for probe email pattern `rbac_auto_*@example.com`. Approve or reject it from `/admin` if desired.

## Browser checks for you

1. **`http://localhost:3000/login`** — sign in as **bekirsucikaran00@gmail.com**.
2. **`http://localhost:3000/admin`** — list users; inspect **pending signups**; approve/reject.
3. Create a signup via register flow — verify **pending** only until approval; login works after approval only.
4. Optional: confirm ADMIN receives WS/toast notification when signup is queued (depends on Rabbit + notifications-service).

## Next URL

**`http://localhost:3000/admin`** (after login).

## Remaining gaps

- **Railway production** `@challenge/auth-service` needs **`RABBITMQ_URI`** if signup notifications matter in deployed env.
- Prefer `docker compose` restarts **with** the same `-f docker-compose.yml -f docker-compose.railway-db.yml --env-file .env.railway.local` you use for the stack.
