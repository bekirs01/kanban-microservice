# Frontend redesign — calendar, shell, worker profiles — report

## Summary

Unified authenticated **app shell** (sidebar, header, main + optional rails), redesigned **Kanban dashboard**, full **calendar** (`/calendar`) with month/week/agenda, **worker directory and profiles** (`/workers`, `/workers/:id`, `/profile`), **`MANAGER` removed** everywhere (roles: `ADMIN`, `USER` only). Profile fields persisted in **auth-service** DB with migration; REST via **API gateway**; **profile broadcasts** invalidate React Query caches. **Web i18n** extended for EN/RU/TR.

---

## Routes added or updated (`apps/web/src/router.tsx`)

| Path | Page / behavior |
|------|----------------|
| `/kanban` | Task board (authenticated) |
| `/calendar` | Full calendar views |
| `/analytics`, `/archive` | Authenticated (no ADMIN-only router gate on these routes — sidebar hides admin-only where applicable) |
| `/automations` | Stub / honest empty state (`AutomationsPage`) |
| `/queue` | Stub / metrics placeholder (`QueuePage`) |
| `/workers` | Worker directory |
| `/workers/:workerId` | Worker profile detail |
| `/profile` | Worker self-service profile; **`ADMIN` redirected to `/admin`** |

---

## Database migration

- **`apps/auth-service/db/migrations/1770890000000-userProfileColumnsAndManagerRemoval.ts`**
  - Adds profile columns (`displayName`, `specialization`, `bio`, `skills` JSONB, `avatarData`, `telegramContact`, `githubUrl`, timestamps as applicable).
  - Migrates **`MANAGER` → `USER`** for legacy rows where applicable.

---

## Backend & shared types

- **`packages/types`**: `UserRole` = `ADMIN` | `USER`; `WorkerSpecialization`; `PatchWorkerProfileDto`; profile/user DTOs; notification payload types.
- **`apps/auth-service`**: RPC handlers for profile + workers directory; Rabbit event on profile updates.
- **`apps/api-gateway`**: `ProfileModule` (`/api/profile`), `WorkersModule` (`/api/workers`, PATCH admin-only).
- **`apps/notifications-service`**: Listen for profile update RPC → **`profile:updated`** WebSocket Fan-out.
- **`apps/tasks-service`**: RBAC checks aligned to two roles only (no `MANAGER`).

---

## Frontend — dashboard / Kanban

- **`AuthenticatedShell`**, **`DashboardSidebar`**, **`DashboardHeader`** with connection / realtime badges, global search hooks, locale, ADMIN-only invite/admin entry.
- **KPI strip**, toolbar (filters / sort / period / refresh), **right rail widgets** where implemented (mini calendar, deadlines, activity), **bottom** automation/queue/system placeholders where data absent.
- **Task cards**: avatars via `avatarData`, initials fallback, priority line, deadlines.

---

## Frontend — calendar

- **Month / week / agenda**; filters (status, priority, assignee, dates, overdue, my tasks).
- Tasks by **deadline**; backlog **no deadline**; overdue styling; **`CreateTaskDialog`** optional deadline preset from calendar day when supported.

---

## Worker profiles & avatars

- **`GET/PATCH /api/profile`** — worker updates **own** profile.
- **`GET /api/workers`**, **`GET/PATCH /api/workers/:id`** — listing + admin patch for `USER` accounts.
- **Avatar**: small JPEG/PNG as **base64 data URL**, validated server-side; shown on board, chips, directories.

---

## RBAC

- **UI**: admin-only buttons hidden or disabled consistent with **`canManageAssignments` / `isAdminRole`**; workers cannot reach `/admin`; **`/profile`** is worker-only shell route (`ADMIN` → `/admin`).
- **Backend** remains authoritative (no privilege escalation attempts in this redesign).

---

## Realtime

- **`useWebSocket`**: invalidate task queries plus **`workersDirectory`**, **`workerProfile`***, **`profileMine`**, **`usersByIds`** when **`profile:updated`** fires (and related events already present for tasks).

---

## i18n

- **`en.ts`**, **`ru.ts`**, **`tr.ts`**: `nav.*`, `dashboard.*`, `calendar.*`, `workers.*`, `profile.*`, `filters.*`; worker role labels per locale (Workers / Работники / Çalışanlar).

---

## Vite workaround

- **`apps/web/vite.config.ts`**: `resolve.alias` for **`@challenge/types/enums` → packages/types TS source** so Rollup can bundle enum values (CJS `dist` named-export interop limitation).

---

## Build results

```text
npm run build --workspace=@challenge/types      # ran as part of web pipeline
npm run build --workspace=@challenge/web           # ✅ tsc -b && vite build
npm run build --workspace=@challenge/auth-service  # ✅
npm run build --workspace=@challenge/api-gateway   # ✅
npm run build --workspace=@challenge/tasks-service # ✅
```

---

## Remaining limitations

- **Automations**, **notifications inbox**, **true online-presence counters**, deep **multi-project** IDs: UI may show placeholders or disabled items where backend/events are absent.
- **Workload %** bars are **derivative / demo-safe** formulas from visible task batches, not a separate HR system.
- **Calendar “all projects”** filter stays label-level unless project entity exists in backend.

---

## Manual test checklist

1. `npm run dev:railway-db`
2. Open `http://localhost:3000/kanban`
3. Login as **ADMIN** — inspect shell, KPI strip, toolbar, board, rails.
4. Open `http://localhost:3000/calendar`
5. Create task with **deadline today** — verify on Kanban + calendar.
6. Edit deadline — task moves cell.
7. Open **`/workers`**, **`/workers/:id`**, **`/profile`** (worker) — edit bio/spec/avatar — verify initials vs photo on cards/chips after save + realtime/other tab refresh.
8. Login as **worker** (`USER`): no admin panel shell entry; **`/profile` works**; destructive/admin task actions hidden per rules.
9. Second browser/session: move/edit task → both UIs refresh without reload.
