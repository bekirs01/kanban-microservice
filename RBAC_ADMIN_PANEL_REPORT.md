# RBAC and Admin Panel

## Changed areas (high level)

- **Shared types**: `UserRole` enum; JWT/auth DTO user includes `role`; task RPC payloads carry `requesterRole`; admin DTOs; `TaskAccessRpcPayload`; `DeleteTaskPayload`; `ForbiddenRpcException`.
- **Auth service**: `users.role` column (default `USER`); bootstrap promotion; JWT access/refresh include `role`; admin-only RPC handlers for list/create users and patch role; public register still creates `USER` then bootstrap may promote.
- **Tasks service**: Enforced permissions on create, list (`sharedBoard` only for ADMIN/MANAGER), get-by-id, comments, history, assign/unassign, update (USER assignee-only `status`), delete (not USER).
- **API gateway**: JWT `validate` exposes `role`; `RolesGuard`; `AdminModule`; `/api/admin/users` (GET, POST), `/api/admin/users/:id/role` (PATCH); tasks routes pass `requesterRole` and clamp `sharedBoard`; `/api/users` limited to ADMIN/MANAGER.

## Migration

- **File**: `apps/auth-service/db/migrations/1747500000000-addUserRole.ts`
- Adds `role` to `auth_service.users` (`NOT NULL`, default `'USER'`).

Run migrations using your usual TypeORM/auth-service migration process (Docker or CLI) after deploying the auth-service build. Do **not** hand-edit production data for this unless you intentionally bypass the migration.

## Admin bootstrap

**Priority:**

1. If `ADMIN_EMAILS` or `BOOTSTRAP_ADMIN_EMAIL` contains the normalized (case-insensitive) user email → that user becomes `ADMIN` on each successful login, register, or refresh (after credential checks).
2. Else, if **no** `ADMIN` exists in the database → the authenticated user from that login/register/refresh is promoted to `ADMIN` (fallback to avoid empty-admin lockout).

**Public `/register`** still creates accounts with role `USER` first; bootstrap then may promote immediately.

### Making an existing account ADMIN

Stable approach (recommended for production-ish demos):

1. Set env on **auth-service** (and redeploy/restart):  
   `ADMIN_EMAILS=you@yourdomain.com`  
   (comma- or semicolon-separated list supported.)
2. Sign in once with that account (or refresh with a valid session). Role updates in DB for the next response.

Emergency / empty DB:

- With **zero** ADMIN rows and no privileged email configured, **the first successful login/register** promotes that user to ADMIN.

## Admin Panel (frontend)

- **Route**: `/admin` (TanStack Router; non-admins redirected to `/kanban`).
- **Header link**: Kanban toolbar shows **Admin panel** only for `ADMIN`.
- **i18n**: `en.ts`, `ru.ts`, `tr.ts` extended with admin and common rbac strings (`admin.title`, `common.adminPanel`, `common.forbidden`, etc.). Note: canonical key for the column label is `admin.roleLabel` (role names use `admin.role.admin` / `.manager` / `.user`).
- Public register link on login page is unchanged (still creates USER + bootstrap rules).

## New HTTP APIs (gateway, prefix `/api`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/admin/users` | ADMIN |
| POST | `/api/admin/users` | ADMIN |
| PATCH | `/api/admin/users/:id/role` | ADMIN |

Forbidden for non-admins (`403`). Last remaining `ADMIN` cannot be demoted to non-admin via PATCH.

## Permissions by role (backend)

| Action | ADMIN | MANAGER | USER |
|--------|-------|---------|------|
| List all tasks (`sharedBoard`) | ✓ | ✓ | ✗ (own / assigned visibility) |
| Create task | ✓ | ✓ | ✗ |
| Assign/unassign | ✓ | ✓ | ✗ |
| Update task fields | ✓ | ✓ | ✓ assignee only, **status** only |
| Delete task | ✓ | ✓ | ✗ |
| Comments | ✓ full | ✓ full | ✓ participant (creator or assignee) |

## Frontend restrictions

- USER: no **New task**; no bulk user list (`/api/users` 403); no assignment UI; no edit/delete toolbar in task modal; draggable cards only when **assigned**; board query never uses shared “all tasks” flag.
- MANAGER / ADMIN: prior task UX plus assignment and full board when `sharedBoard` is requested.

## Realtime / i18n / login

- No intentional changes to websocket event names or notification wiring; payloads still use actor id and recipients as before.
- Login/register/refresh still return JWTs; payloads now include `role`. Refresh interceptor updates stored `user` when the auth service sends it back.

## Build verification (local)

- `npx turbo run build --filter=@challenge/types`
- `npx turbo run build --filter=@challenge/exceptions`
- `npx turbo run build --filter=@challenge/auth-service --filter=@challenge/tasks-service --filter=@challenge/api-gateway --filter=@challenge/web`

## Manual test checklist (from brief)

1. Promote existing user to ADMIN (env + login).
2. Login as ADMIN; open `/admin`.
3. Create a USER via admin form; logout; login as USER → no admin link, no new task, `/api/users` blocked.
4. As ADMIN/MANAGER, create task, assign USER; USER sees it; delete hidden; drag only if assigned; comments if participant.
5. Confirm Kanban realtime still updates across sessions when infra is up.

## Limitations / follow-ups

- JWT `logout` gateway path semantics unchanged (pre-existing quirks).
- TASK `assignees` uses `simple-array` + `ILIKE` query; unchanged semantics.
- `MANAGER` has same task mutate power as ADMIN except user-admin APIs (explicitly ADMIN-only).
