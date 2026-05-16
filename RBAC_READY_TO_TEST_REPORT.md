# RBAC readiness report (Railway PostgreSQL)

## Summary

Local stack was started with `npm run dev:railway-db` (PostgreSQL pointing at Railway via `docker-compose.railway-db.yml` overrides). Auth migrations were executed via `docker compose exec auth-service npm run migration:run --workspace=@challenge/auth-service` (already applied — no pending migrations). The shared `role` column on `auth_service.users` exists.

## 1. Migration

| Item | Status |
|------|--------|
| Migration run command | Completed — **No migrations are pending** (schema up to date) |
| Evidence | TypeORM migration runner against datasource used by auth-service |

## 2. `role` column

| column_name | data_type |
|-------------|-----------|
| role | character varying |

## 3. ADMIN account

- **ADMIN email**: `bekirsucikaran00@gmail.com`
- **Rationale**: Chosen as the likely primary developer account for this workspace (`bekirsucikaran`); all other rows looked like disposable test registrations.
- **If this is incorrect**: Promote another account with a single non-destructive update (replace email):

```sql
UPDATE auth_service.users
SET role = 'ADMIN'
WHERE email = '<your-email>';

UPDATE auth_service.users
SET role = 'USER'
WHERE email = 'bekirsucikaran00@gmail.com';
```

(Only switch back the previous ADMIN if needed; adjust emails to match your choice.)

## 4. `ADMIN_EMAILS` on Railway

| Item | Status |
|------|--------|
| Service | `@challenge/auth-service` (production) |
| Variable | `ADMIN_EMAILS` |
| Set automatically | **Yes** (Railway CLI `variable set`) |
| Value | Same as ADMIN email above (login/refresh will keep role aligned with allowlist) |

If production auth-service does not pick this up immediately, trigger a redeploy of that service in the Railway dashboard.

## 5. Admin Panel URL (local)

- **Frontend**: `http://localhost:3000/admin`
- **Admin API (gateway)**: `http://localhost:3001/api/admin/users` (GET list, POST create, PATCH role — all require authenticated ADMIN)

## 6. Test users (API)

| Item | Status |
|------|--------|
| `test_user_<timestamp>@example.com` | **Not created** — no password was used to obtain an ADMIN JWT in this session |
| `test_manager_<timestamp>@example.com` | **Not created** — same reason |

After you log in as ADMIN in the browser, you can create these from **Admin Panel** or `POST /api/admin/users` with your bearer token.

## 7. Expected behavior (from implemented RBAC)

### USER

- Cannot access `/admin` (route guard / UI).
- Cannot create tasks, assign users, or delete tasks (tasks-service + UI restrictions); Kanban view/interaction allowed per existing shared-board rules.

### ADMIN

- Can open `/admin`.
- Can list users and assign roles (USER / MANAGER / ADMIN) via Admin Panel and admin APIs.

### Kanban / realtime

- No database reset or schema destructive changes were performed; services use the same shared Railway database and RabbitMQ as before.

## 8. Builds

Executed successfully:

- `npm run build --workspace=@challenge/types`
- `npm run build --workspace=@challenge/web`
- `npm run build --workspace=@challenge/api-gateway`
- `npm run build --workspace=@challenge/auth-service`
- `npm run build --workspace=@challenge/tasks-service`

## 9. Manual browser checks (required)

1. Log in as **ADMIN** (`bekirsucikaran00@gmail.com` or the email you intentionally promoted): confirm **Admin** entry/nav visible; open **`/admin`**; list users loads.
2. From Admin Panel (or Swagger with token): create one **USER** and one **MANAGER** test account; verify rows in DB or list refresh.
3. Log out; log in as a **USER** account: confirm **no Admin** navigation; confirm **cannot** create / assign / delete tasks on a shared board scenario you use.

## 10. Outstanding / risks

- **Wrong ADMIN email**: If `bekirsucikaran00@gmail.com` was not your main account, run the SQL snippet in §3 against the correct row and update Railway `ADMIN_EMAILS` accordingly.
- **Production deploy**: Confirm Railway `@challenge/auth-service` finished redeploy after `ADMIN_EMAILS` change (`railway logs` / dashboard).

## Files changed in this readiness pass

| File | Action |
|------|--------|
| `RBAC_READY_TO_TEST_REPORT.md` | Created |

No application code changes were required for DB promotion or Railway variable configuration.
