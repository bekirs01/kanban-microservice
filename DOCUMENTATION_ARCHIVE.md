# Repository documentation archive

Merged copy of Markdown files in this repository. Regenerate with `scripts/combine-markdown.sh`.

UTC: 2026-05-17T12:32:35Z





---

## Source: `ANALYTICS_REDESIGN_REPORT.md`

# Analytics redesign report

## Changed files

- `apps/web/src/pages/AnalyticsPage.tsx`
- `apps/web/src/components/dashboard/AnalyticsDashboard.tsx` (new)
- `apps/web/src/lib/analyticsScope.ts` (new)
- `apps/web/src/i18n/locales/en.ts`
- `apps/web/src/i18n/locales/ru.ts`
- `apps/web/src/i18n/locales/tr.ts`
- `ANALYTICS_REDESIGN_REPORT.md` (this file)

## What was fixed

- Replaced the fragmented analytics layout (`DashboardKpiStrip`, `DashboardStats`, three oversized chart cards) with a single cohesive dashboard component.
- Resolved chart and legend overlap by using a fixed donut size container, `min-w-0` / `overflow-hidden` on legend and bar columns, and a trend chart with fixed height (`h-[200px]`) and `preserveAspectRatio`.
- Reduced the “huge bottom chart” problem: trend uses a compact area/line SVG instead of the previous wide bar-plus-line block spanning two columns.
- Balanced spacing: KPI grid (`2×4` on typical widths), two-column distribution charts, `3-column` row with trend (2) + activity (1), full-width worker load and deadline sections.

## Blocks implemented

| Block | Data source |
| --- | --- |
| KPI strip (8 cards) | `computeStats`, `countCreatedToday` on filtered tasks |
| Status distribution | `statusDistributionForAnalytics` |
| Priority distribution | `priorityDistributionForAnalytics` |
| Created trend (8 weeks) | `weeklyCreatedBuckets` |
| Team activity | Recent tasks by `createdAt` (honest “created” events only; no fake history) |
| Worker load | Assignee counts from tasks; `ADMIN` sees all assignees in scope, `USER` only own row |
| Deadline control | Upcoming (7 days), overdue, due this calendar week, no-deadline lists |

## Working filters

- **Period**: filters tasks with `createdAt` ≥ start of today / week (Monday) / month, or all time.
- **Status / priority**: exact match when not “all”.
- **Worker**: visible only for `ADMIN`; restricts to tasks where assignee list includes the user id.
- **Reset**: clears all filters to defaults.

All filtered blocks use the same `applyAnalyticsFilters` output (`filteredTasks`).

## Overlap / layout

- Distribution: `flex-col` → `lg:flex-row` with explicit donut wrapper `h-[168px] w-[168px]` and separate scroll-safe legend column.
- Trend: single card, bounded height, full-width SVG; empty state uses a dashed box instead of an empty giant chart.
- Activity: `max-h-[280px] overflow-y-auto` to avoid blowing the layout.

## Empty states

- Zero tasks in a chart: short `noData` copy instead of rendering broken visuals; trend uses dashed placeholder.
- No workload rows: `noWorkload`.
- No activity rows: `noNoActivity`.
- Deadline subsections: `emptySection` when a list is empty.
- Percentages: only when `total > 0`; bar widths use `maxCount` ≥ 1.
- Done KPI: completion hint only when `tasks.length > 0`.

## Roles (ADMIN / USER only)

- Worker filter and full worker load grid: **ADMIN only**.
- **USER**: sees own workload slice and directory built from `useUsersByIds` for visible task participants (no `MANAGER` role introduced).

## i18n keys added

New strings under `analytics.*` in `en`, `ru`, `tr`, including: `title`, `subtitle`, KPI labels, section titles, filter labels, `filteredResults`, `completionRate`, `workloadBreakdown`, `weeksWindow`, `filterAnyStatus`, `filterAnyPriority`, `filterAnyWorker`, `noWorkload`, `emptySection`, `noDeadlineTasks`, activity labels, etc. Legacy keys (`pageTitle`, `pageSubtitle`, `chart*`, `navLabel`) kept for compatibility.

## Build results

```text
npm run build --workspace=@challenge/web   → success (tsc -b && vite build)
npm run build --workspace=@challenge/types → success
```

## Remaining limitations

- Task list is capped at **500** items (`useTasks`); analytics reflect that page only.
- **Period** is based on **`createdAt`**, so overdue tasks created before the selected window disappear from KPIs and lists when a narrow period is selected.
- **Team activity** only lists **creation** time (no `updatedAt` on `ResponseTaskDto`); no synthetic move/delete feed.
- **Assignee display** in deadline rows uses the first assignee for initials when multiple assignees exist.
- `DashboardAnalyticsSection.tsx` is **unused** on `/analytics` but left in the repo for safety; can be removed later if desired.

## Manual test checklist

1. `npm run dev:railway-db` (or your usual local stack).
2. Open `http://localhost:3000/analytics`.
3. Log in as **ADMIN**: verify KPIs, charts, filters, worker filter, worker load, deadlines, task click opens **TaskDetailDialog**.
4. Change period / status / priority / worker; confirm KPI count text (`filteredResults`) updates.
5. Resize window (mobile width → desktop); confirm no overlapping chart/legend.
6. Log in as **USER**: confirm worker filter hidden, workload shows only self, board data still scoped to assignee rules.
7. Search codebase for `MANAGER` in **runtime app paths** you care about; this change set does not reintroduce it.


---

## Source: `DASHBOARD_FULL_IMPLEMENTATION_REPORT.md`

# Dashboard full implementation report (Prompt 2)

## Changed files

- `apps/web/src/lib/dashboardDerived.ts` — `QuickTaskFilter`, `isTaskOverdue`, `searchQuery` / quick filters in `applyClientTaskFilters`, partial deadline range (`from` or `to`), `unassigned` in `DashboardStats`, `ClientTaskFilters` shape.
- `apps/web/src/pages/KanbanPage.tsx` — filtered pipeline wired to stats, calendar, plan, bottom bar; search; chips; clear/reset; `applySelectedDay` sync (week/month anchor + mini calendar month); admin `listAdminUsers` for assignee options and participants; prev/next planner clears day filter; activity + participants panels.
- `apps/web/src/hooks/useWebSocket.ts` — after task-related invalidation, invalidates `usersByIds` for assignee avatars.
- `apps/web/src/components/KanbanBoard.tsx` — overdue border/badge; undated deadline label i18n; unassigned assignee label.
- `apps/web/src/components/dashboard/DashboardStats.tsx` — eight metrics including `thisWeek` and `unassigned`.
- `apps/web/src/components/dashboard/DashboardToolbar.tsx` — search field (i18n placeholder).
- `apps/web/src/components/dashboard/DashboardBottomBar.tsx` — quick-filter chips (overdue / today / week / all) + refresh; uses filtered task list for counts.
- `apps/web/src/components/dashboard/DashboardSidebar.tsx` — removed reports/settings nav; optional **Participants** item for `ADMIN` only; nav id type trimmed.
- `apps/web/src/components/dashboard/DailyPlanPanel.tsx` — overdue section (deduped vs selected day); priority dots; overdue styling; i18n for empty deadline/assignee short.
- `apps/web/src/components/dashboard/MiniCalendar.tsx` — optional `tasks` prop for due-dot indicators; `shadow-md`.
- `apps/web/src/components/dashboard/WeekPlanner.tsx` — `shadow-md`.
- `apps/web/src/components/dashboard/DashboardFilterChips.tsx` — **new** (all / overdue / today / this week / my tasks).
- `apps/web/src/components/dashboard/DashboardParticipantsPanel.tsx` — **new** (ADMIN: directory from `listAdminUsers`, role i18n, assignment counts from full task list).
- `apps/web/src/components/dashboard/DashboardActivityPanel.tsx` — **new** (honest empty state, i18n).
- `apps/web/src/i18n/locales/en.ts`, `ru.ts`, `tr.ts` — new `dashboard.*` keys for filters, search, activity, participants, hints.

## Completed UI sections

- Left sidebar: board / calendar / my tasks; **Participants** (ADMIN only) scrolls to directory; invite → `/admin` for ADMIN; team avatars from task-derived users.
- Header (unchanged behavior from Phase 1): layout toggle, i18n, connection, logout.
- Stats strip: total, due today, overdue, this week, in progress, done, assigned to me, unassigned — **from current filtered task set**.
- Quick filter chips + reset filters + popover filters + search.
- Week/month planner, mini calendar (sync with selected day week anchor), daily plan (overdue block + day/upcoming lists), Kanban columns with scroll cap.
- Right rail: mini calendar, daily plan, **team directory** (ADMIN), **activity placeholder**.
- Bottom bar: clickable summary chips tied to quick filters, refresh, last updated.

## Functional controls

- **New task** — opens create dialog when role is not `USER` (unchanged RBAC).
- **Filters popover** — status, priority, assignee, deadline range (full or single bound), clear-all.
- **Search** — title + description, client-side on fetched page.
- **Quick chips / bottom chips** — overdue, today, this week, all, my tasks.
- **Reset filters** — clears chips, search, popover fields, selected day; nav back to board if was “my tasks”.
- **Week** — prev/next/today, day click filters board; “all days” clears day filter.
- **Mini calendar** — selects day and syncs week (or month anchor); dots for due counts **after current filters**.
- **Daily plan** — opens task detail on row; open calendar focuses planner; overdue tasks highlighted.
- **Refresh** — `refetch()` tasks query.
- **Participants (ADMIN)** — read-only directory; assignment counts from full fetched task list.
- **Activity** — static empty message (no fabricated events).

## Database-backed operations

No new tables or SQL. All task changes remain via existing REST + React Query + WebSocket invalidation: create, update (status, deadline, priority, assignees, etc.), delete, move column — persisted by existing `tasks-service` as before.

## Calendar / filtering / stats behavior

- Selected day restricts tasks to that deadline date (tasks **without** deadline excluded for that filter).
- Quick filters combine with popover filters and search (intersection).
- Stats, planner counts, mini-calendar dots, daily plan, and board all use **`filteredTasks`** so they stay consistent under filters and day selection.
- Overdue: deadline date before **today**, status not `DONE`.

## Participant / team behavior

- **ADMIN**: full user list from `GET /api/admin/users` (shared React Query key `adminUsers`); participants panel + sidebar entry; assignee dropdown includes directory users not only task-visible ids.
- **MANAGER / USER**: no directory panel or nav; assignee filter limited to users resolved from visible tasks (`useUsersByIds`).

## Activity behavior

- No task-history API wired on dashboard; panel shows explicit empty copy per locale.

## RBAC behavior

- **USER**: cannot create tasks; drag only on assigned tasks; no admin invite; no participants directory.
- **MANAGER**: can manage board per existing rules; no admin-only user directory.
- **ADMIN**: invite, participants, enriched assignee list.
- Backend enforcement unchanged (gateway / tasks-service).

## i18n coverage

- All new or changed visible strings use `dashboard.*` / existing `admin.role.*` / `task.*` keys in **en**, **ru**, **tr**.

## Real-time behavior

- Debounced ~200ms: invalidate task queries + refetch active; invalidate `usersByIds` once per sync so assignee chips update without spamming extra task refetches.

## Build result

- `npm run build --workspace=@challenge/types` — success.
- `npm run build --workspace=@challenge/web` — success.
- Backend workspaces not modified.

## Remaining limitations

- Task fetch capped at **100** items; very large boards truncate server-side for this page.
- **Activity** feed is not wired to task history API on this page (honest placeholder only).
- **Calendar layout** mode still shows the planner hint card instead of a separate full-month task grid.
- **Online status** for team is not shown (no live presence source).
- Single-bound date filter still **excludes tasks with no deadline** when any deadline bound is set.


---

## Source: `DASHBOARD_UI_PHASE_1_REPORT.md`

# Dashboard UI — Phase 1 report

## Changed files

- `apps/web/src/pages/KanbanPage.tsx` — dashboard shell, filter pipeline, layout modes, data wiring
- `apps/web/src/components/KanbanBoard.tsx` — column internal scroll; task card status progress bar
- `apps/web/src/lib/dashboardDerived.ts` — client-side stats, filters, sorting, planner helpers
- `apps/web/src/i18n/locales/en.ts` — `dashboard.*` strings
- `apps/web/src/i18n/locales/ru.ts` — `dashboard.*` strings
- `apps/web/src/i18n/locales/tr.ts` — `dashboard.*` strings

## New components (`apps/web/src/components/dashboard/`)

- `DashboardSidebar.tsx` — nav, team avatars, admin-only invite link
- `DashboardHeader.tsx` — title, realtime status, locale, greeting, role, admin, logout, Kanban/Calendar mode switch
- `DashboardStats.tsx` — six stat tiles from live task list
- `DashboardToolbar.tsx` — new task (RBAC), filters popover, week/month planner mode, sort mode
- `WeekPlanner.tsx` — week or month day strip, counts, today, prev/next, all-days clear
- `MiniCalendar.tsx` — month grid; picks day (syncs filters)
- `DailyPlanPanel.tsx` — plan for selected day or upcoming 7 days; open calendar scroll
- `DashboardBottomBar.tsx` — overdue / due today / this week + last updated + refresh

## UI sections added

1. Left sidebar with navigation, team block, invite (ADMIN)
2. Sticky-style header row with layout toggle
3. Stats row (total, due today, overdue, in progress, done, assigned to me)
4. Toolbar + filter popover + planner granularity + sort
5. Week/month planner strip
6. Main Kanban (unchanged DnD) or calendar hint panel
7. Right rail: mini calendar + daily plan
8. Bottom summary bar

## Functional controls

- **New task:** unchanged dialog; only non-`USER` roles
- **Filters:** status, priority, assignee (from users appearing on tasks), deadline range; clear resets day filter too
- **Week/month strip:** prev/next, today, day select toggles deadline-day filter, “all days” clears day filter
- **Sort:** deadline / priority / created (client-side ordering inside columns)
- **My tasks:** sidebar sets assignee-self filter (kept when switching to calendar until “Task board” clears it)
- **Kanban | Calendar:** calendar hides columns, scrolls/focuses planner; Kanban shows board
- **Mini calendar:** month nav, day select updates `selectedDay`
- **Daily plan:** lists real tasks for day or upcoming; rows open task detail; “Open calendar” scrolls to planner + calendar layout
- **Refresh:** `refetch()` on tasks query
- **Admin / Invite / Logout / Language:** preserved behavior
- **Disabled nav:** Participants, Reports, Settings — tooltip “coming later”

## Values derived from DB/API data

- All counts and lists use `useTasks` payload (`limit: 100`) — same query as before, now shared across widgets
- Stats: totals, due today, overdue (deadline before today, not DONE), in progress, done, assigned to me, this week (`isSameWeek` vs deadline)
- Planner counts: tasks with deadline on that local day
- Team avatars: unique `creatorId` + `assignees` resolved via `useUsersByIds`
- `dataUpdatedAt` from React Query for “last updated”

## RBAC

- `sharedBoardQueryFlag` unchanged for task list
- `showNewTask` only when role ≠ `USER`
- Kanban drag rules unchanged (`canDragTaskOnBoard`)
- Admin panel button only `ADMIN`
- Invite only `ADMIN` (links to `/admin`)
- User batch API for avatars already used on board cards; same as before

## i18n

- New namespace `dashboard` in `en`, `ru`, `tr`
- Includes required keys plus extras (`clearFilters`, `anyAssignee`, sort labels, mini-calendar aria, `calendarLayoutHint`, `navComingSoon`, etc.)

## Manual test checklist

1. Login as USER — no new task, no admin, no invite; board + filters + planner + detail still work; drag only if assignee
2. Login as MANAGER/ADMIN — create task, drag columns, filters, day select, refresh, WebSocket still updates list
3. Switch EN/RU/TR — new strings translate
4. Sidebar: board / calendar scroll; my tasks narrows list; disabled items show tooltip
5. Bottom bar numbers match expectations for your seed data

## Prompt 2 suggestions

- Dedicated `/calendar` route or full calendar grid view
- Participants / reports / settings pages
- Server-driven notification count and bell
- Persist filter presets; saved views
- Comment counts on cards when API exposes them on list DTO
- Presence-based “team online”
- Export / settings actions in toolbar
- Performance: pagination or virtualized columns for large boards


---

## Source: `DATABASE_CONNECTION_REPORT.md`

# Database connection report

This document summarizes how PostgreSQL is wired in this repository from configuration and Docker Compose definitions. Runtime health was not executed as part of this write-up.

**Optional:** To point local Docker backends at **Railway PostgreSQL** while keeping the default stack, see **`LOCAL_WITH_RAILWAY_DB.md`**, **`docker-compose.railway-db.yml`**, and **`.env.railway.example`**.

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
| Host port mapping | `5433:5432` (host **5433** → container **5432**) |
| Init script volume | `./init.sql` mounted to `/docker-entrypoint-initdb.d/init.sql` (runs only on fresh data volume) |
| Data persistence | Named volume `postgres_data` |
| Health check | `pg_isready -U postgres` |

**Compose network vs DBeaver (host):**

- Backend services keep **`DB_HOST=db`** and **`DB_PORT=5432`** — they connect to PostgreSQL inside the Docker network at **`db:5432`** (internal container port is unchanged).
- **DBeaver** (or any SQL client running on your machine) uses **host `localhost`**, **port `5433`**, DB **`challenge_db`**, user **`postgres`**, password **`password`** (`docker-compose.yml` publishes `5433:5432` to avoid clashes with another local Postgres on 5432).

---

## 3. Database name, user, password, host, and port

| Variable / role | `db` container / Postgres | In-app env (Compose injects into DB-using backends) |
|-----------------|---------------------------|-------------------------------------------------------|
| Database | `challenge_db` (`POSTGRES_DB`) | `DB_NAME=challenge_db` |
| User | `postgres` (`POSTGRES_USER`) | `DB_USER=postgres` |
| Password | `password` (`POSTGRES_PASSWORD`) | `DB_PASS=password` |
| Host (inside Compose network) | Docker DNS name **`db`** | `DB_HOST=db` (**unchanged** — backends connect to **`db:5432`**) |
| Port (**inside container / Compose**) | Postgres listens on **5432** | `DB_PORT=5432` |
| Host + port from **your machine** (DBeaver, `psql` on host → Docker-published port) | `localhost` (**or** `127.0.0.1`), port **`5433`** — see `5433:5432` mapping in Compose | Nest run **on the host** targeting Docker Postgres → `DB_HOST=localhost`, **`DB_PORT=5433`** |

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
- `port`: `5432` (**host OS → Postgres in Compose**: publish is **`5433:5432`**, so from the laptop use **`localhost:5433`**, not 5432, unless Postgres is elsewhere.)
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

Operational success still depends on **Docker/Colima running**, a free **published host port for Postgres (`5433` by default in this compose file)**, and sufficient resources for first-time image pull and build.

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
| `connection refused` from **host** tooling | Postgres not reachable on expected host port | Compose maps **`5433` → container `5432`**. Use **`localhost:5433`** on the host (**DBeaver**). Inside Compose, backends still use **`db:5432`**. |
| `password authentication failed` | Wrong `DB_USER`/`DB_PASS` | Match Compose: `postgres` / `password` unless you changed env |
| Migrations fail on first boot | Postgres not ready or schema missing | Wait for healthy `db`; ensure `init.sql` ran (new volume); check service logs |
| Port **`5433`** already in use on host | Another process bound `5433` | Change the **left side** of the `ports` mapping in `docker-compose.yml` (e.g. `5434:5432`) — **do not** change backend `DB_PORT`/`DB_HOST`; use the new host port in DBeaver |
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


---

## Source: `DATABASE_STRUCTURE_EXPLANATION.md`

# Database structure explanation

This document describes how data storage works in this monorepo. It reflects **repository inspection only** — no destructive operations, installs, or refactors were performed to produce it.

---

## Answers to the questionnaire

### 1. Which database is used?

**PostgreSQL** (`postgres` driver via **TypeORM**).

### 2. Where is the database defined?

- **Infrastructure:** Docker Compose service `db` in `docker-compose.yml` (`image: postgres:17.5-alpine3.21`, volumes, env).
- **Application wiring:** Each backend that uses Postgres configures TypeORM in `apps/<service>/db/datasource.ts`.
- **Logical layout:** PostgreSQL schemas are created during first DB init by `init.sql` (mounted into the container).

### 3. What is the database name?

**`challenge_db`** — set by `POSTGRES_DB` on the Postgres container and matched by `DB_NAME=challenge_db` for `auth-service`, `tasks-service`, and `notifications-service` in `docker-compose.yml`.

### 4. Username and password (local Docker)

From `docker-compose.yml`:

| Setting    | Value     |
|-----------|-----------|
| User      | `postgres`|
| Password  | `password`|

(Auth for RabbitMQ management is separate: `admin` / `admin`; that is **not** the Postgres password.)

### 5. Which Docker service runs PostgreSQL?

The Compose service **`db`** (container name **`db`**).

### 6. Which services connect to the database?

| Compose / app service        | Connects to PostgreSQL? |
|-----------------------------|--------------------------|
| `auth-service`              | **Yes** (TypeORM)        |
| `tasks-service`             | **Yes** (TypeORM)        |
| `notifications-service`     | **Yes** (TypeORM)        |

### 7. Which services do NOT connect directly to the database?

| Service        | Reason |
|----------------|--------|
| `web`          | Frontend; talks HTTP to the gateway only |
| `api-gateway` | Proxies REST → TCP/RPC to other services; no `DB_*` / no TypeORM in this arrangement |
| `rabbitmq`     | Message broker only |

### 8. Which schema belongs to each service?

| Service                    | PostgreSQL schema        | Config location |
|---------------------------|---------------------------|----------------|
| `@challenge/auth-service` | **`auth_service`**        | `apps/auth-service/db/datasource.ts` |
| `@challenge/tasks-service`| **`task_service`**       | `apps/tasks-service/db/datasource.ts` |
| `@challenge/notifications-service` | **`notification_service`** | `apps/notifications-service/db/datasource.ts` |

Schemas are created in `init.sql` (`CREATE SCHEMA IF NOT EXISTS …`).

### 9. Where are user accounts saved?

**Schema:** `auth_service`  
**Table:** **`users`** (entity: `apps/auth-service/src/user/entity/user.entity.ts`, `@Entity('users')`)

Stores: UUID `id`, `username`, `email`, `passwordHash`, `refreshTokenHash`, timestamps.

### 10. Where are tasks saved?

**Schema:** `task_service`  
**Table:** **`tasks`** (entity: `apps/tasks-service/src/task/entity/task.entity.ts`, `@Entity("tasks")`)

### 11. Where are comments saved?

**Schema:** `task_service`  
**Table:** **`comments`** (entity: `apps/tasks-service/src/comment/entity/comment.entity.ts`, `@Entity("comments")`), with a **many-to-one** relation to `Task` (`taskId`) and **`onDelete: "CASCADE"`** from task.

### 12. Where is task history saved?

**Schema:** `task_service`  
**Table:** **`task_history`** (entity: `apps/tasks-service/src/history/entity/task-history.entity.ts`, `@Entity("task_history")`)

Stores audit rows: `task_id`, `action` (`ActionType` enum), `changes` (JSON `old` / `new`), `changed_by`, `changed_at`.

### 13. Where are notifications saved?

**Schema:** `notification_service`  
**Table:** **`notifications`** (entity: `apps/notifications-service/src/notifications/entity/notification.entity.ts`, `@Entity("notifications")`)

Fields include `userId`, `title`, `content`, `read`, `createdAt`.

### 14. Which TypeORM entities exist?

| App                    | Entity file(s) |
|------------------------|----------------|
| auth-service           | `User` → `apps/auth-service/src/user/entity/user.entity.ts` |
| tasks-service          | `Task`, `Comment`, `TaskHistory` → under `apps/tasks-service/src/*/entity/` |
| notifications-service  | `Notification` → `apps/notifications-service/src/notifications/entity/notification.entity.ts` |

Shared enums used by entities/DTOs (e.g. `TaskPriority`, `TaskStatus`, `ActionType`) live in **`packages/types`** (`packages/types/enums/index.ts`).

### 15. Which migrations exist?

Repositories under each service:

**auth-service** (`apps/auth-service/db/migrations/`)

- `1764995289244-createUserTable.ts`
- `1765483388960-alterTableUserAddRefreshTokenHashAndPasswordHash.ts`

**tasks-service** (`apps/tasks-service/db/migrations/`)

- `1765044450524-createTasksTable.ts`
- `1765208180948-alterTableTasksAddAssignees.ts`
- `1765217182623-createTableComments.ts`
- `1765495680814-createTableTaskHistory.ts`

**notifications-service** (`apps/notifications-service/db/migrations/`)

- `1765285176813-createTableNotifications.ts`

### 16. How are migrations executed?

1. **TypeORM CLI** is wired via workspace scripts in each service’s `package.json` (`migration:run` runs `npm run typeorm -- migration:run` with datasource `db/datasource.ts`).
2. **Local Docker Compose (intended path):** `docker-compose.yml` runs for each DB-owning service, before Nest starts:

   `npm run migration:run --workspace=@challenge/<service>`

See also `DATABASE_CONNECTION_REPORT.md` for command examples (`docker compose exec …`).

**Current datasource note:** In the repository **as inspected**, each `apps/*/db/datasource.ts` has `migrationsRun: false` but **`synchronize: true`**. That means TypeORM can **auto-sync** schema from entities at startup, which bypasses migrations for DDL in practice. (`DATABASE_CONNECTION_REPORT.md` describes the earlier “migrations-first” Compose story.) For predictable environments, migrations should remain the DDL source of truth once `synchronize` is turned off again (policy decision).

### 17. How does data flow when a user registers?

1. Browser → **`POST /api/auth/register`** on **API Gateway** (`apps/api-gateway/src/auth/auth.controller.ts`).
2. Gateway → **`auth.register`** TCP message to **auth-service**.
3. **AuthController** (`MessagePattern`) → **AuthService.register** → **UserService.create**.
4. **UserService** hashes password and **`userRepository.save(...)`** → row in **`auth_service.users`**.
5. Tokens generated; **`refreshTokenHash`** updated on same user row.
6. Response (tokens + user DTO) returns through gateway — **no direct DB access** from gateway or web.

### 18. How does data flow when a user logs in?

1. **`POST /api/auth/login`** → gateway → **`auth.login`** → **AuthService.login**.
2. **UserService.getByEmail** reads **`auth_service.users`**.
3. bcrypt compare; JWTs minted; **refresh token hash** stored on **users** row.
4. Tokens returned via gateway.

### 19. How does data flow when a task is created?

1. Authenticated **`POST /api/tasks`** on gateway attaches **`creatorId`** from JWT (`TasksController`).
2. Gateway sends **`task.create`** to **tasks-service**.
3. **TaskService.create** → **`taskRepository.save(dto)`** → **`task_service.tasks`**.
4. **No history row or RabbitMQ emit** occurs in **`TaskService.create`** in the current code (creation audit / `task.created` event is **not** wired there).

### 20. How does data flow when a task is moved?

Kanban moves map to **`PATCH /api/tasks/:id`** updating fields (typically **`status`**).

1. Gateway → **`task.update`** with `UpdateTaskPayload` (`taskId`, `authorId`, changed fields).
2. **TaskService.update** loads task, computes **diff**, then **`saveHistory`** → **`task_service.task_history`** with **`STATUS_CHANGE`** or **`UPDATE`**.
3. **Task row** persisted with new values **`task_service.tasks`**.
4. **notifyUpdate** emits **`task.updated`** on RabbitMQ to **notifications-service** recipients (excluding author).

Assign/unassign and comments also write **`task_history`** and emit **`task.assigned`**, **`task.updated`**, or **`task.comment`**.

### 21. How does RabbitMQ relate to the database?

- **tasks-service** is both a **PostgreSQL writer** for tasks/comments/history and an **RMQ publisher** (`ClientProxy.emit`) for notification-related events (`NOTIFICATION_SERVICE` client in `task.module.ts` / `comment.module.ts`).
- **notifications-service** consumes from queue **`notifications_queue`** (`apps/notifications-service/src/main.ts`), handles **`task.assigned`**, **`task.updated`**, **`task.comment`** (`EventPattern`s in `notifications.controller.ts`).
- Handling methods call **`NotificationsService`** which **persists rows** into **`notification_service.notifications`** and pushes **WebSocket** events via the gateway.

RabbitMQ is **not** a substitute for Postgres for core domain entities; it **couples** tasks activity to asynchronous notification persistence + realtime push.

### 22. Does RabbitMQ store permanent data or only pass events?

- **Queues** are declared with **`queueOptions: { durable: false }`** in Nest RMQ configs (messages are **not** guaranteed long-term persistence on the broker the way durable queues imply).
- **Permanent user-facing notification history** intended for this app is in **PostgreSQL** (`notifications` table), written when events are processed successfully.

So: RabbitMQ carries **delivery of events**; durable business record for notifications is **the database**.

### 23. If I want to add a new field to tasks, where should I change it?

1. **`apps/tasks-service/src/task/entity/task.entity.ts`** — add the TypeORM `@Column()` (and relations if needed).
2. **`packages/types`** — extend **`CreateTaskDto` / `UpdateTaskDto` / payloads** if the API should accept or return the field (`packages/types/dto/tasks/`).
3. **Gateway** Swagger/DTO imports pick up `@challenge/types` — usually no duplication if DTO lives in packages.
4. **Frontend** — forms, API typings, Kanban/task detail UI as needed (`apps/web/...`).
5. **Migration** — add a migration under **`apps/tasks-service/db/migrations/`** (recommended once `synchronize` is disabled for DDL control).

### 24. If I want to add tags to tasks, what files would need to change?

**Facts:** **`Task`** has **no tags** column/array and **`CreateTaskDto`** / **`UpdateTaskDto`** expose **no tag field**. i18n keys such as **`board.tags`** are **UI-only** placeholders, not persisted types.

Likely touches:

- `apps/tasks-service/src/task/entity/task.entity.ts` (e.g. `simple-array` or junction table entity).
- New migration in **`apps/tasks-service/db/migrations/`** (recommended).
- **`packages/types/dto/tasks/create-task.dto.ts`** and **`update-task.dto.ts`** (+ any response DTO if returned to client).
- **`TaskService`** and possibly query filters in **`getAll`**.
- **`apps/web`** Kanban/task detail/search components.
- If tags are normalized: possibly **new table** relations and repository methods.

### 25. If I want to add a new table, where should I create the entity and migration?

- Put the **`@Entity()`** classnext to related domain code under the owning service (**`apps/<service>/src/...`**), using the correct **`schema`** from that service’s `datasource.ts`.
- Generate/add a **`MigrationInterface`** under **`apps/<service>/db/migrations/`** for that schema.
- Register entity path indirectly via **`dist/**/*.entity.js`** builds (ensure build output picks up entity).

Cross-service FKs across schemas are uncommon here; prefer **IDs** referencing users/tasks from other schemas without Postgres-level FK constraints unless you deliberately design composite ownership.

### 26. Should I edit SQL manually or create a TypeORM migration?

For this repo pattern:

| Approach              | Recommendation |
|----------------------|----------------|
| **Ad-hoc `psql`**    | Okay for **exploration** or **safe** bootstrap like `init.sql` already in repo — avoid one-off DDL in production without versioning |
| **TypeORM migrations** | **Preferred** for team review, repeatable deploys, rollback story |

Manual SQL for **schemas** duplicates what `init.sql` already establishes; coordinate if you extend schema creation.

### 27. Safest way to add database changes in this project?

1. **Design** schema change in entity + migrations under the **correct service schema**.
2. **Run migrations** locally (Compose or `npm run migration:run --workspace=@challenge/tasks-service`) and verify `\dt <schema>.*`.
3. **Avoid** disabling constraints or rewriting production volumes without backups.
4. **Align environments:** if **`synchronize: true`** remains on any env, DDL can diverge silently from migrations — prefer **`synchronize: false`** plus migrations for deterministic deploys.
5. **Cross-service IDs:** preserve UUID strings consistently (auth IDs used as `creatorId`, `assignees`, notification `userId`).

### 28. Commands to inspect the database (Docker)

From repo root, with Compose stack running:

```bash
docker compose ps db
docker inspect --format '{{.State.Health.Status}}' db
docker compose exec db psql -U postgres -d challenge_db -c "SELECT version();"
docker compose exec db psql -U postgres -d challenge_db -c "\dn"
```

### 29. Commands to see tables

```bash
docker compose exec db psql -U postgres -d challenge_db -c "\dt auth_service.*"
docker compose exec db psql -U postgres -d challenge_db -c "\dt task_service.*"
docker compose exec db psql -U postgres -d challenge_db -c "\dt notification_service.*"
```

### 30. Commands to see users / tasks / notifications data

**Users (auth)**

```bash
docker compose exec db psql -U postgres -d challenge_db -c 'SELECT id, username, email, "createdAt" FROM auth_service.users LIMIT 20;'
```

**Tasks**

```bash
docker compose exec db psql -U postgres -d challenge_db -c 'SELECT id, title, status, "creatorId" FROM task_service.tasks LIMIT 20;'
```

**Notifications**

```bash
docker compose exec db psql -U postgres -d challenge_db -c 'SELECT id, "userId", title, read, "createdAt" FROM notification_service.notifications LIMIT 20;'
```

Avoid dumping password hashes unnecessarily in screenshots or logs.

### 31. What should I avoid so I don’t break the database?

- **`docker compose down -v`** or deleting **`postgres_data`** volume without backup (`init.sql` re-runs, **data is wiped**).
- Editing **`postgres_data`** externally while containers run.
- **Conflicting DDL:** `synchronize: true` + manual DB edits / partial migrations causing drift or duplicate objects.
- **Wrong `DB_NAME` / schema:** datasource falls back to `postgres` DB if env unset (`database: process.env.DB_NAME || 'postgres'`) — different from Compose’s `challenge_db`.
- **`uuid` dependency:** migrations reference `uuid_generate_v4()` — Postgres needs **`uuid-ossp`** (often added in migration/extension steps; verify migrations ran if insert fails).

---

## Diagram: request path vs persisted data

```
Frontend (@challenge/web)
        │  HTTPS (REST)
        ▼
API Gateway (@challenge/api-gateway)
        │
        ├── TCP / ClientProxy ──► Auth Service ──► PostgreSQL `auth_service`
        │
        └── TCP / ClientProxy ──► Tasks Service ──► PostgreSQL `task_service`
                        │
                        └── RMQ emit ─────────────► Notifications Service
                                      ├──► PostgreSQL `notification_service`
                                      └──► WebSocket to clients
```

---

## Schema reference

### `auth_service`

| Table      | Purpose |
|-----------|---------|
| **`users`** | Registered accounts: credentials, JWT refresh hashing, timestamps |
| **`migrations`** | TypeORM migration history (see `migrationsTableName` in datasource) |

### `task_service`

| Table           | Purpose |
|----------------|---------|
| **`tasks`**     | Kanban task rows (title, description, enums, assignees[], deadline, creator, timestamps) |
| **`comments`**  | Comments on tasks; FK to task (`CASCADE` delete) |
| **`task_history`** | Audit log of changes (assignment, status, updates, comments, deletes) |
| **`migrations`** | TypeORM migration history |

PostgreSQL enums for task priority/status are created by migrations (e.g. `tasks_priority_enum`, `tasks_status_enum`).

### `notification_service`

| Table               | Purpose |
|--------------------|---------|
| **`notifications`** | Per-user persisted notification records + read flag |
| **`migrations`**    | TypeORM migration history |

---

## Feature honesty (requirements check)

| Item | Status in this codebase |
|------|-------------------------|
| **Tags on tasks** | **Not modeled** — no `tags` on `Task`; i18n has a “tags” label for UI strings only |
| **Automation rules persisted** | **Not present** — no automation tables or entities inspected |
| **Admin / per-board column configuration in DB** | **Not present** — columns derive from **`TaskStatus`** enum in frontend (`KanbanBoard` / `TaskDetailHeader`) |
| **`task.created` event** | **Partial** — **`notifyTaskCreated`** exists in **`NotificationsService`** but **notifications controller has no `@EventPattern('task.created')`**, and **`TaskService.create` does not emit** that event (`PROJECT_ANALYSIS_REPORT.md` aligns with this) |
| **Supabase** | **Not required** — self-hosted Postgres + TypeORM (`DATABASE_CONNECTION_REPORT.md`) |

---

## Recommended next database step

**Restore “migrations-first” DDL as the single source of truth:** set **`synchronize: false`** in all three `datasource.ts` files (after confirming `init.sql` + migrations run cleanly in every deployment path — Docker Compose and any cloud override), run **`migration:show`** before deploy, and reserve **`synchronize: true`** only for throwaway demo DBs.

This minimizes surprise schema drift (especially harmful for hackathon demos and parallel Railway/Docker setups) while keeping **`init.sql`** for schema namespace creation only.


---

## Source: `DBEAVER_RAILWAY_CONNECTION_INFO.md`

# DBeaver → Railway PostgreSQL (shared database)

Use this to browse the **same** database as your local `npm run dev:railway-db` stack and your **deployed** Railway services. Do **not** point DBeaver at `127.0.0.1:5433` if you need that shared data — that is local Docker only.

All values below come from your machine’s **`.env.railway.local`** at the repo root (gitignored). Open the file locally and copy each field; **do not** commit this file or paste passwords into chat.

## New connection

| Field | What to enter |
|--------|----------------|
| **Connection type** | **PostgreSQL** |
| **Host** | Value of **`RAILWAY_DB_HOST`** (Railway **public / proxy** hostname, often `*.proxy.rlwy.net`) |
| **Port** | Value of **`RAILWAY_DB_PORT`** |
| **Database** | Value of **`RAILWAY_DB_NAME`** |
| **Username** | Value of **`RAILWAY_DB_USER`** |
| **Password** | Value of **`RAILWAY_DB_PASS`** (from your local `.env.railway.local` only) |

## SSL

- If **`DB_SSL=true`** in `.env.railway.local`, enable SSL/TLS in DBeaver (e.g. **SSL** tab: use SSL, or **require** / **prefer** depending on your driver — match your Railway connection requirements).

## After connecting

### Schemas to open

In the database navigator, expand **schemas** and use:

- `auth_service`
- `task_service`
- `notification_service`

### Tables to check

| Schema | Table |
|--------|--------|
| `auth_service` | `users` |
| `task_service` | `tasks` |
| `task_service` | `comments` |
| `task_service` | `task_history` |
| `notification_service` | `notifications` |

## SQL (verification)

**Users**

```sql
SELECT id, username, email, "createdAt"
FROM auth_service.users
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Tasks**

```sql
SELECT id, title, status, "creatorId", "createdAt"
FROM task_service.tasks
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Comments**

```sql
SELECT id, content, "taskId", "createdAt"
FROM task_service.comments
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Task history**

```sql
SELECT id, task_id, action, changed_by, changed_at
FROM task_service.task_history
ORDER BY changed_at DESC
LIMIT 20;
```

**Notifications**

```sql
SELECT id, "userId", title, read, "createdAt"
FROM notification_service.notifications
ORDER BY "createdAt" DESC
LIMIT 20;
```

## Updating credentials

If Railway rotates Postgres credentials, refresh `.env.railway.local` (e.g. `npm run sync:railway-env` when Railway CLI is linked) and update the same fields in DBeaver.


---

## Source: `DEVELOPMENT_TODO.md`

# Development TODO

**Rule for Cursor and all contributors:** Before every development step, read **`PROJECT_RULES.md`**, **`HACKATHON_CASE_REQUIREMENTS.md`**, **`I18N_IMPLEMENTATION_PLAN.md`**, and this file (**`DEVELOPMENT_TODO.md`**).

**Maintenance:** When work completes, update this checklist—mark finished items with **`[x]`**, keep pending items as **`[ ]`**. Never mark something complete unless it is verified done. Prefer small edits that mirror actual merged behavior.

---

## 1. Project Setup

- [x] Inspect current project structure
- [x] Identify frontend framework
- [x] Identify backend framework
- [x] Identify database
- [x] Identify real-time technology
- [x] Identify queue/message broker technology
- [x] Check how to run the project locally
- [x] Verify and document PostgreSQL Docker Compose wiring (see `DATABASE_CONNECTION_REPORT.md`)

## 2. Kanban Board

- [ ] Display board columns
- [ ] Display task cards
- [ ] Create task
- [ ] Edit task
- [ ] Delete task
- [ ] Move task between columns
- [ ] Support custom columns if possible

## 3. Task Fields

- [ ] Add task ID
- [ ] Add title
- [ ] Add description
- [ ] Add status
- [ ] Add priority
- [ ] Add tags
- [ ] Add created date
- [ ] Add deadline

## 4. Real-Time Synchronization

- [x] Detect current real-time implementation
- [x] Sync task creation
- [x] Sync task updates
- [x] Sync task movement
- [x] Sync task deletion
- [x] Show connection status

## 5. Event-Driven Logic

- [x] Emit task created event
- [x] Emit task updated event
- [x] Emit task moved event
- [x] Emit task deleted event
- [x] Store or process events if required

## 6. Automation

- [x] Add notification when task is created
- [x] Add notification when task is moved
- [ ] Add rule-based task movement
- [ ] Add tag-based flags
- [ ] Add deadline-based reactions

## 7. Queue Processing

- [x] Inspect RabbitMQ or Kafka setup
- [ ] Add incoming task API if missing
- [ ] Add validation
- [ ] Add deduplication
- [ ] Add enrichment
- [ ] Add error handling

## 8. Notifications

- [ ] Show system notifications
- [ ] Show user notifications
- [x] Send real-time notifications (board + toasts via WebSocket)
- [x] Avoid duplicate notifications (actor-based toast mute for own actions)

## 9. Internationalization

- [x] Create i18n structure
- [x] Add English translations
- [x] Add Russian translations
- [x] Add Turkish translations
- [x] Replace hardcoded UI text
- [x] Add language selector
- [x] Save selected language

## 10. UI and Demo Quality

- [ ] Improve visual consistency
- [ ] Make board understandable for jury
- [ ] Make buttons and forms clear
- [ ] Add empty states
- [ ] Add loading states
- [ ] Add error states

## 11. Reliability

- [ ] Handle API errors
- [ ] Handle real-time disconnect
- [ ] Prevent data loss
- [ ] Prevent duplicate tasks
- [ ] Prevent invalid task movement
- [ ] Keep UI state consistent

## 12. Documentation

- [ ] Update README
- [ ] Add architecture description
- [ ] Add technologies used
- [ ] Add local run instructions
- [ ] Add deployment instructions
- [ ] Add demo scenario

## 13. Deployment

- [ ] Choose deployment target
- [ ] Configure environment variables
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Test deployed app
- [ ] Add deployed URL to README


---

## Source: `FINAL_DATABASE_VISIBILITY_REPORT.md`

# Final database visibility report

## Architecture (one shared Railway PostgreSQL)

| Consumer | Database |
|----------|----------|
| **Local app** (`npm run dev:railway-db`) | **Railway PostgreSQL** via `RAILWAY_DB_*` / `DB_SSL` in Docker |
| **Deployed Railway app** | **Same** Railway PostgreSQL when each service’s `DB_*` variables reference the Railway Postgres plugin |
| **DBeaver** | **Same** Railway PostgreSQL using the **public** host/port and credentials (see `DBEAVER_RAILWAY_CONNECTION_INFO.md`) |

Local Docker **`db`** may still run on your machine for other workflows; it is **not** the primary store for Railway DB mode.

## Verified in this run

- **`.env.railway.local`:** Present with `RAILWAY_DB_HOST`, `RAILWAY_DB_PORT`, `RAILWAY_DB_USER`, `RAILWAY_DB_PASS`, `RAILWAY_DB_NAME`, and `DB_SSL=true`.
- **Stack:** `npm run dev:railway-db`; **API:** `GET /api/health` returned ok.
- **Test user:** Registered via `POST /api/auth/register` with username pattern `final_db_test_<timestamp>` — **found** in `auth_service.users` on Railway Postgres.
- **Test task:** Created via `POST /api/tasks` with title `Final DB test task <timestamp>` — **found** in `task_service.tasks` on Railway Postgres.

## DBeaver — fields to enter

Use **PostgreSQL**. Copy from **your local** `.env.railway.local`:

- **Host** = `RAILWAY_DB_HOST`
- **Port** = `RAILWAY_DB_PORT`
- **Database** = `RAILWAY_DB_NAME`
- **Username** = `RAILWAY_DB_USER`
- **Password** = `RAILWAY_DB_PASS` (never commit; never paste into shared chat)

Enable **SSL** when **`DB_SSL=true`**.

## SQL queries to run

Same as `DBEAVER_RAILWAY_CONNECTION_INFO.md` (users, tasks, comments, task_history, notifications).

## Remaining manual actions

1. In DBeaver, create/update the connection using values from `.env.railway.local` only on your machine.
2. On **Railway**, ensure deployed **auth**, **tasks**, and **notifications** services each have `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, and **`DB_SSL=true`** if your driver needs TLS to the same instance (see `RAILWAY_DEPLOY_VARIABLES_TO_SET.md`).
3. Re-run **`npm run sync:railway-env`** after Railway rotates database credentials, then refresh DBeaver and local `.env.railway.local`.

## Optional

If startup fails with migration errors but tables already exist, see **`npm run repair:railway-migrations`** and `ONE_MAIN_DATABASE_SETUP.md`.


---

## Source: `FRONTEND_REDESIGN_CALENDAR_PROFILES_REPORT.md`

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


---

## Source: `HACKATHON_CASE_REQUIREMENTS.md`

# Hackathon Case Requirements

## Executive overview

This document defines the hackathon scenario for **Kanban task management**, comparable in intent to mainstream products such as **Jira** and **Trello**. Teams deliver a cohesive **frontend** and **backend**, demonstrate **real-time collaboration**, expose **integrations** suitable for queued task intake, and show **notifications**, **administration**, and **automation**. Submissions must be **reliable**, **demonstrably synchronized**, and **production-minded** enough to deploy for jury review.

---

## 1. Kanban board

The product must expose a configurable **Kanban board** with baseline workflow columns plus extensibility:

| Requirement | Detail |
| ----------- | ------ |
| Default columns | **To Do**, **In Progress**, **Review**, **Done** |
| Custom columns | Administrators can configure additional or renamed columns aligned to process needs |
| Behaviour | Columns represent lifecycle stages; tasks move between columns according to user actions or automation |

---

## 2. Task card (task model)

Every task MUST support at least the following attributes:

| Field | Description |
| ----- | ----------- |
| **ID** | Stable identifier for references, APIs, notifications, and queue messages |
| **Title** | Short human-readable summary |
| **Description** | Longer explanatory content |
| **Status** | Aligned with board column / workflow stage |
| **Priority** | Relative urgency or importance |
| **Tags** | Labels for filtering, routing, automation, or visual grouping |
| **Created date** | Audit and ordering |
| **Deadline** | Scheduling; may drive automation or warnings |

Implementations MAY add internal fields as needed provided the contract above remains satisfied for users and integrations.

---

## 3. User functionality

Authenticated (or duly scoped) end users MUST be able to:

- **View** tasks on the board and in detail contexts
- **Create** tasks with required metadata
- **Edit** mutable fields consistent with authorization rules
- **Delete** tasks where policy allows
- **Move** tasks between columns via drag-and-drop or equivalent explicit actions
- **Receive real-time notifications** when relevant domain events occur (assignments, status changes, comments if present, deadlines, automation outcomes, etc.)

---

## 4. Admin functionality

Administrative roles MUST be able to operate the operational layer of Kanban workflow:

| Capability | Objective |
| ---------- | --------- |
| **Configure board columns** | Shape workflows without developer intervention |
| **Configure automation rules** | Encode policy (e.g. move on deadline, escalate on priority) |
| **Control incoming task flow** | Govern validation, quotas, moderation, or assignment defaults for externally ingested tasks |
| **Manage notifications** | Tune what users receive, channels, thresholds, deduplicated noise control |

Administrative UX may be consolidated or split across screens provided all capabilities remain accessible and auditable enough for demonstration.

---

## 5. Real-time behaviour

- When **any user mutates shared state that affects visible tasks**, other connected clients MUST reflect the update **without manual page refresh**.
- The UI MUST remain **synchronized** across sessions observing the same board or overlapping task scope.
- Degraded-network behaviour SHOULD be clarified (retry, reconciliation, optimistic rollback) when demonstrated.

---

## 6. Event-driven architecture

The system MUST **react programmatically** to domain events across services or modules. Mandatory event categories:

1. **Task created**
2. **Task updated**
3. **Task moved**
4. **Task deleted**

Downstream subscribers (notifications, analytics, automation engine, integrations) SHOULD consume these events through a documented pattern consistent with asynchronous messaging where appropriate.

---

## 7. Automation

Beyond manual drag-and-move, teams SHOULD showcase **rule-driven behaviour**:

| Area | Illustrative behaviours |
| ---- | ----------------------- |
| **Automatic notifications** | Trigger on transitions, mentions, SLA breaches |
| **Rule-based task movement** | Promote to Review when checklist complete or move to Done when reviewer approves |
| **Tag-based flags** | Visual emphasis, escalation, rerouting queues |
| **Deadline-based reactions** | Warnings before due date or auto-transition after breach |

Automation MUST be coherent with permission and concurrency rules.

---

## 8. Queue processing

The platform SHOULD accept **incoming work** representing tasks produced outside the interactive UI—for example inbound API submissions or asynchronous **message brokers**:

- **Recommended technologies**: **RabbitMQ** or **Apache Kafka**, justified by backlog volume, persistence model, replay needs, delivery semantics demonstration

Queue handling MUST minimally include stages or documented equivalents:

| Stage | Purpose |
| ----- | ------- |
| **Deduplication** | Prevent accidental double-processing via idempotency keys or natural keys |
| **Validation** | Schema, ACL, tenancy, cardinality against limits |
| **Enrichment** | Default priorities, SLA tags, inferred assignees from mappings |
| **Safe error handling** | Dead-lettering, exponential backoff semantics, Poison message isolation when explained |

Demonstrations SHOULD show at least **one realistic failed message path** resolving without silent loss.

---

## 9. Notifications

The submission MUST unify across channels logically:

| Type | Audience / scope |
| ---- | ---------------- |
| **System notifications** | Policy, maintenance, degraded integration |
| **User notifications** | Direct user relevance (assignment, mentions, completions) |
| **Real-time notifications** | WebSocket or analogous push surfaced live in-browser |

Delivery MUST align with §5 (immediate visibility) wherever applicable.

---

## 10. Non-functional requirements

| Requirement | Expectation |
| ----------- | ----------- |
| **Reliability** | Graceful handling of partial failures; recovery paths demonstrable |
| **No message loss** | At-least-once or exactly-once semantics explicitly chosen and justified in README / architecture prose |
| **Error handling** | Uniform error surfaces API↔Gateway↔Frontend; surfaced to operators where appropriate |
| **Consistent UI state** | Reconciliation eliminates ghost cards or orphaned optimistic rows after conflicts |
| **Conflict control** | Last-writer-visible OR explicit versioning / merge strategy explained |
| **Scalable architecture** | Logical service boundaries permitting horizontal scaling of stateless layers or partitioned queues |

---

## 11. Expected deliverable

Each team MUST supply:

1. **Working backend** services (or modular monolith if justified) implementing core domain, integrations, and messaging
2. **Working frontend** covering board interaction, admin surfaces (or equivalent), and notification presentation
3. **Source code** in a repository with clear structure
4. **README** containing:
   - High-level **architecture** diagram or narrative
   - **Technology** stack justification
   - **Run instructions** (local and/or containerized)
5. **Server deployment** instructions or live URL suitable for jury access (HTTPS preferred)

---

## Jury Evaluation Criteria

The jury may assess submissions across the following dimensions (not necessarily equal weight):

| Criterion | Focus |
| --------- | ----- |
| **Functionality** | Completeness versus scope, correctness of CRUD & movement |
| **Real-time synchronization** | Observed simultaneity, absence of stale UI without refresh |
| **Automation logic** | Non-trivial rules, correctness, observability |
| **Interface usability** | Clarity, flow, error affordances, accessibility basics |
| **Reliability** | Recovery, messaging integrity, demonstrated edge cases |
| **Additional useful features** | Thoughtful extras without destabilizing core scope |
| **Technical implementation quality** | Idiomatic frameworks, cohesive layering, test evidence if any |
| **Code quality** | Readability, consistency, avoidance of gratuitous complexity |
| **Architecture quality** | Separation of concerns, messaging patterns, observability hooks |
| **Deployment readiness** | Reproducibility, environment discipline, secrets hygiene |

---

## Minimum Winning Demo

A **minimum strong jury demo** SHOULD, in a single continuous session:

1. Open the board in **two separate browser contexts** representing **distinct users**.
2. **User A** moves a task between columns; **User B observes the movement immediately** without reloading.
3. An **automatic notification** appears relevant to that change (assignment, transition, comment, or rule trigger as appropriate).
4. **Create or enqueue a task** through an **HTTP API or message queue** pathway (not only the primary UI form), then show its appearance on the board after processing.
5. Trigger an **automation rule** responding to either a **tag** or a **deadline** condition (movement, notification, or flag).
6. Present a **clean, professional UI** aligned with hackathon polish, with **English, Russian, and Turkish** internationalization either **implemented** or **clearly staged** as the next planned iteration (navigation copy, labels, selector affordance roadmap explained live or in README).

Teams meeting this baseline with stable execution and articulate architecture narrative are positioned competitively for recognition.


---

## Source: `I18N_IMPLEMENTATION_PLAN.md`

# Internationalization (i18n) Implementation Plan

## Purpose

This document describes how to add **three-language UI support**—**English**, **Russian**, and **Turkish**—to the Kanban web client with **English as the default**. It is a **planning artifact only**; execution should follow `PROJECT_RULES.md` and `.cursor/rules/i18n-rules.mdc`.

---

## 1. Current problem

| Issue | Description |
| ----- | ----------- |
| **Incomplete internationalization** | Visible strings are not consistently routed through a translation layer. |
| **Hardcoded UI text** | Labels, buttons, empty states, errors, and headings appear as literals inside components and related hooks. |
| **Portuguese remnants** | Parts of the UI still show **Portuguese** copy, which does not match the target locales for this hackathon roadmap. |
| **Locale gap** | The application must surface **English**, **Russian**, and **Turkish** for **all** user-visible text; today that coverage is missing or inconsistent. |

---

## 2. Target result

| Goal | Acceptance |
| ---- | ---------- |
| **Language selector** | Users choose **English**, **Russian**, or **Turkish** from the UI (`English`, `Русский`, `Türkçe`). |
| **Persisted choice** | Selected language is **saved locally** (recommended: `localStorage`; alternative: cookie if SSR constraints appear later). |
| **Immediate UI update** | Changing language re-renders affected UI without full reload; a refresh MUST restore the saved locale. |
| **Default** | First visit with no saved preference uses **English (`en`)**. |
| **No hardcoded visible strings** | JSX and client-visible `toast`/`dialog`/validation messages use **translation keys**, not raw literals (except truly dynamic values such as user names or numeric IDs, which stay data—not copy). |

---

## 3. Translation structure

### 3.1 Recommended layout (adapt to repo)

This monorepo hosts the SPA under **`apps/web/`**. Prefer co-locating i18n with the web package rather than a repository-root `src/` folder.

**Recommended:**

```
apps/web/src/i18n/
  index.ts           # i18n bootstrap, resource registration, helper exports
  locales/
    en.json          # English (source of truth for keys)
    ru.json          # Russian
    tr.json          # Turkish
```

Optional later splits if files grow large:

```
apps/web/src/i18n/locales/
  board.en.json
  auth.en.json
```

Merge at build-time or in `index.ts`; keep **key parity** across locales.

### 3.2 Technology suggestion

Use a maintained stack such as **`i18next`** + **`react-i18next`** + **`i18next-browser-languagedetector`** (detector optional if custom persistence is preferred). Justify any deviation in the implementing PR (bundle size, SSR, team familiarity).

### 3.3 Fallback chain

- Missing key in `ru` or `tr`: fall back to **`en`** string to avoid blank UI during incremental migration.
- Log missing keys in **development only** if the chosen library supports it.

---

## 4. Translation key examples

Use **stable, English, dot-separated** keys. **Do not** encode Russian or Turkish in key names.

Examples:

| Key | Typical usage |
| --- | ------------- |
| `board.title` | Page or board header |
| `board.connected` | Connection status chip |
| `board.disconnected` | Connection lost state |
| `board.addTask` | Primary action button |
| `board.columns.todo` | Column header |
| `board.columns.inProgress` | Column header |
| `board.columns.review` | Column header |
| `board.columns.done` | Column header |
| `auth.logout` | Sign-out control |
| `task.title` | Label for title field |
| `task.description` | Label for description |
| `task.priority` | Priority selector label |
| `task.deadline` | Deadline picker label |
| `notification.taskCreated` | Toast / realtime banner |
| `notification.taskMoved` | Toast / realtime banner |

Extend with namespaces only if needed (`auth.login.submit`, `errors.network`), keeping depth shallow enough for grep-friendly maintenance.

---

## 5. Language selector plan

### 5.1 Placement

- Add a compact control in the **global shell**: header, settings menu, or profile dropdown—whichever matches existing layout with minimal visual churn.
- Labels shown in the menu use **endonym** spelling: **English**, **Русский**, **Türkçe**.

### 5.2 Behaviour

- Selecting a locale calls `i18next.changeLanguage(code)` (or equivalent) and persists `en` | `ru` | `tr`.
- Realtime hooks (WebSocket listeners, query caches) **must not** unsubscribe or reset board state on language switch; only **presentation strings** change.

### 5.3 Accessibility

- Expose `aria-label` on the selector via translated strings.
- Preserve keyboard operability if the control is a custom component.

---

## 6. Persistence

| Mechanism | Recommendation |
| --------- | --------------- |
| **Primary** | `localStorage` key such as `locale` or `i18nextLng` aligned with library conventions |
| **Scope** | Device-local; document that multi-device sync is out of scope unless user accounts store preference server-side later |
| **Hydration** | On app bootstrap, read storage **before** first paint of static chrome if possible to avoid flash-of-wrong-language |

If a future SSR layer is introduced, revisit storage vs cookie; current Vite SPA likely uses `localStorage` only.

---

## 7. Rules for implementation

| Rule | Detail |
| ---- | ------ |
| **No hardcoded UI text** | Strings visible to users go through the translation function / component. |
| **No mixed languages in one component** | A single active locale applies; dynamic interpolation uses parameters, not bilingual literals. |
| **Do not translate internal code names** | Types, enums in code, routes, and API field names stay English. |
| **Do not rename identifiers to Russian or Turkish** | Variables, functions, files, folders remain English per project standards. |
| **Translations live in locale files** | `en.json`, `ru.json`, `tr.json`—not scattered constants. |
| **No code comments** unless the stakeholder explicitly requests them. |
| **No unrelated UI redesign** | Typography and layout changes only where required for text length or overflow. |
| **Preserve realtime** | Language changes must not tear down sockets or lose optimistic updates. |
| **Preserve Kanban** | Drag-and-drop, ordering, and mutations behave identically across locales. |

### 7.1 Migrating Portuguese strings

- Inventory Portuguese literals.
- Replace each with a **key** and supply **English**, **Russian**, and **Turkish** values; treat English as the authoring reference.
- Remove Portuguese from default resources once parity is verified.

### 7.2 Backend-originated messages

- If API returns human-readable errors, prefer **stable error codes** and map them to translated strings on the client. Avoid breaking contracts; coordinate any payload change with gateway and services.

---

## 8. Step-by-step future implementation checklist

Copy this list into the task tracker when execution begins; mark items as work completes.

- [ ] Inspect project structure (`apps/web/src`, routing, layout shell)
- [ ] Detect framework stack and any existing i18n hooks or dependencies
- [ ] Find all hardcoded UI texts (including Portuguese) via search and manual sweep
- [ ] Create translation file structure under `apps/web/src/i18n/` (or adapted path)
- [ ] Add English translations (complete key set for targeted screens)
- [ ] Add Russian translations (parity with English keys)
- [ ] Add Turkish translations (parity with English keys)
- [ ] Replace hardcoded texts with translation lookups / components
- [ ] Add language selector (`English`, `Русский`, `Türkçe`)
- [ ] Save selected language locally and restore on load
- [ ] Test all primary pages and flows
- [ ] Test real-time board behaviour after language switches (no regression)

---

## 9. Testing checklist

Perform these **manual** passes after implementation (desktop; repeat spot-check on mobile viewport if supported).

| # | Test |
| - | ---- |
| 1 | Switch **English → Russian**; verify all touched screens update |
| 2 | Switch **Russian → Turkish**; verify consistent coverage |
| 3 | **Refresh** the page; verify **saved language** restores |
| 4 | **Create task**; labels, buttons, validation, success feedback translated |
| 5 | **Move task** across columns; headers and tooltips remain correct |
| 6 | **Delete task**; confirmations and empty states translated |
| 7 | Trigger **notifications** (create/move); titles and bodies localized |
| 8 | Open **empty board** state; copy is translated and layout intact |
| 9 | **Login / logout** flows; all visible strings localized |
|10 | **Column names** reflect locale (including any custom columns once supported) |

Regression focus:

- Websocket reconnect still shows `board.connected` / `board.disconnected` appropriately.
- Long strings (especially Russian) do not clip critical controls.

---

## Deliverable note

This file is documentation only. Implementation PRs should reference it, update `README.md` with **how to add a new key**, and keep diffs small per `PROJECT_RULES.md`.


---

## Source: `LOCAL_RUNTIME_CONNECTION_FIX_REPORT.md`

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


---

## Source: `LOCAL_RUN_STATUS_REPORT.md`

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


---

## Source: `LOCAL_WITH_RAILWAY_DB.md`

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


---

## Source: `ONE_DATABASE_FINAL_REPORT.md`

# One database final report

Date: setup for **Railway PostgreSQL as the shared primary database** for local + deployed workloads.

---

## Changed files

| File | Change |
|------|--------|
| `apps/tasks-service/src/task/task.module.ts` | RMQ client uses `RABBITMQ_URI` and queue `notifications_queue` |
| `apps/tasks-service/src/comment/comment.module.ts` | Same |
| `apps/tasks-service/src/main.ts` | Default RMQ URL host `rabbitmq` (Docker service name) |
| `apps/notifications-service/src/main.ts` | Default RMQ URL host `rabbitmq` |
| `docker-compose.railway-db.yml` | Replaced `depends_on` so services do not require local `db`; Railway `DB_*` + JWT/RABBITMQ overrides |
| `scripts/dev-backend-railway-db.sh` | Validates five `RAILWAY_DB_*` keys; starts stack **without** `db` |
| `.env.railway.example` | Placeholders only |
| `package.json` | Added `dev:railway-db`, `dev:local-db`; kept `dev:backend:railway-db` alias |
| `ONE_MAIN_DATABASE_SETUP.md` | **Primary** developer doc for this workflow |
| `ONE_DATABASE_FINAL_REPORT.md` | This summary |
| `LOCAL_WITH_RAILWAY_DB.md` | Short supplement; points to `ONE_MAIN_DATABASE_SETUP.md` |

`.gitignore` already contained `.env.railway.local` — no change required.

---

## Source code

**Yes.** Only **RabbitMQ** wiring in **tasks-service** and **notifications-service** `main.ts`, plus **task** / **comment** modules — narrow scope, no unrelated refactors.

---

## Command: local app with Railway DB

After creating `.env.railway.local` from Railway Postgres:

```bash
npm run dev:railway-db
```

Equivalent: `bash scripts/dev-backend-railway-db.sh`

**Fallback (local Docker Postgres only):**

```bash
npm run dev:local-db
```

---

## DBeaver rule

Use **Railway dashboard → Postgres → connection** (public host/port, `PG*` values, SSL if required).

**Not** `127.0.0.1:5433` for shared/deployed data — that remains **local Docker only**.

---

## Railway variables to copy into `.env.railway.local`

From **Postgres** service:

- `PGHOST` → `RAILWAY_DB_HOST`
- `PGPORT` → `RAILWAY_DB_PORT`
- `PGUSER` → `RAILWAY_DB_USER`
- `PGPASSWORD` → `RAILWAY_DB_PASS`
- `PGDATABASE` → `RAILWAY_DB_NAME`

Optional: `JWT_SECRET`, `RABBITMQ_URI` (see `ONE_MAIN_DATABASE_SETUP.md`).

---

## SQL verification

See **ONE_MAIN_DATABASE_SETUP.md** — users, tasks, and notifications queries.

---

## Local Docker DB

Still available via `npm run dev:local-db`; volume untouched. Not the default path when you use `dev:railway-db`.

---

## Modes summary

| Script | DB writes go to |
|--------|-----------------|
| `npm run dev:railway-db` | **Railway PostgreSQL** |
| `npm run dev:local-db` | **Local Docker `db`** |
| Deployed Railway services | **Railway PostgreSQL** (when variables reference Railway Postgres) |

Local frontend always talks to **local gateway** `http://localhost:3001`; deployed web must use public `VITE_API_URL` / `VITE_WEBSOCKET_URL` baked at build.


---

## Source: `ONE_MAIN_DATABASE_SETUP.md`

# One main database: Railway PostgreSQL

This is the **recommended** setup for daily development when you want **one shared database** for:

- Local Docker backends (and browser UI on localhost)
- Railway-deployed services
- DBeaver

**Railway PostgreSQL** holds **auth_service**, **task_service**, and **notification_service** schemas (same as documented in `DATABASE_STRUCTURE_EXPLANATION.md`).

---

## What is primary vs fallback

| Mode | Database | Command |
|------|-----------|---------|
| **Primary (recommended)** | **Railway Postgres** | `npm run dev:railway-db` |
| **Optional fallback** | Local Docker `db` volume (`127.0.0.1:5433` on host per `docker-compose.yml`) | `npm run dev:local-db` |

Local Docker Postgres **is not deleted**; it remains for offline or isolated work. **Do not** expose it publicly or connect Railway to your Mac.

---

## Local run (shared Railway database)

### Step 1

```bash
cp .env.railway.example .env.railway.local
```

### Step 2

Edit `.env.railway.local`. Set **non-empty** values from **Railway → your project → Postgres service → Variables** (or **Connect** tab):

| Variable | Copy from Railway |
|----------|-------------------|
| `RAILWAY_DB_HOST` | `PGHOST` or hostname in `DATABASE_URL` / public proxy host |
| `RAILWAY_DB_PORT` | `PGPORT` (often `5432` for internal-style values; use the port Railway shows for your connection method) |
| `RAILWAY_DB_USER` | `PGUSER` |
| `RAILWAY_DB_PASS` | `PGPASSWORD` |
| `RAILWAY_DB_NAME` | `PGDATABASE` (often `railway`) |
| `DB_SSL` | `true` for Railway **public** host (TLS); `false` for local Docker Postgres |

Optional:

| Variable | When |
|----------|------|
| `JWT_SECRET` | Should match **api-gateway**, **auth-service**, and **notifications-service** on Railway if you share auth tokens across local + cloud |
| `RABBITMQ_URI` | Omit to use **local Docker RabbitMQ** (`amqp://admin:admin@rabbitmq:5672`). Set to Railway RabbitMQ only if you use that broker end-to-end |

### Automate `.env.railway.local` (Railway CLI)

If you are logged in and linked:

```bash
npm run sync:railway-env
```

This writes `.env.railway.local` from the **Postgres** service (`DATABASE_PUBLIC_URL`) and copies `JWT_SECRET` from **`@challenge/api-gateway`** when available. It does not print secrets.

### First-time / existing Railway DB and migrations

If tables already exist but TypeORM’s `migrations` table is empty, startup may fail with **relation already exists**. Run once (inserts migration **metadata** only):

```bash
npm run repair:railway-migrations
```

Then run `npm run dev:railway-db` again.

**Never commit** `.env.railway.local` (it is gitignored).

### Step 3

```bash
npm run dev:railway-db
```

This starts **rabbitmq**, **auth-service**, **tasks-service**, **notifications-service**, **api-gateway**, and **web**. Backends use **Railway** `DB_*` / `DB_SSL` via `docker-compose.railway-db.yml`; the local **`db`** service is **not** a dependency for those services in this mode (you may still have an old `db` container running from a previous session).

If SSL errors occur when connecting to Railway Postgres from Docker, enable SSL in the client driver (TypeORM/Node `pg` may need `ssl` in datasource for strict providers — address errors as they appear).

### Step 4

Open the app:

**http://localhost:3000**

### Step 5

Confirm data in **DBeaver** using a **Railway** connection (see below), not `127.0.0.1:5433`.

---

## Frontend URLs (local)

- **UI:** `http://localhost:3000`
- **API (browser → gateway):** `http://localhost:3001` (from `apps/web/.env` → `VITE_API_URL`)

The gateway still runs locally in Docker; only **PostgreSQL** is remote (Railway).

## Railway-deployed web

The deployed frontend must be built with:

```env
VITE_API_URL=https://<your-api-gateway-public-url>
VITE_WEBSOCKET_URL=https://<your-notifications-service-public-url>
```

Same **Postgres** service variables as below should be attached to **auth**, **tasks**, and **notifications** on Railway.

---

## DBeaver: Railway PostgreSQL (shared data)

To see rows written by **both** local and deployed apps, connect DBeaver to **Railway Postgres** using dashboard values:

| Field | Source |
|-------|--------|
| Host | Railway Postgres **public** host (e.g. `*.proxy.rlwy.net`) |
| Port | Railway Postgres **public** port |
| Database | `PGDATABASE` / value you use as `RAILWAY_DB_NAME` |
| Username | `PGUSER` |
| Password | `PGPASSWORD` |
| SSL | Enable if Railway requires TLS (typical for public endpoints) |

**Do not** use `127.0.0.1:5433` to inspect this shared database — that is **only** the local Docker Postgres from `docker-compose.yml`.

---

## SQL verification (run against Railway DB in DBeaver)

**Users**

```sql
SELECT id, username, email, "createdAt"
FROM auth_service.users
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Tasks**

```sql
SELECT id, title, status, "creatorId", "createdAt"
FROM task_service.tasks
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Notifications**

```sql
SELECT id, "userId", title, read, "createdAt"
FROM notification_service.notifications
ORDER BY "createdAt" DESC
LIMIT 20;
```

---

## Railway deployment checklist (same database)

### Postgres (all of auth, tasks, notifications)

Set referenced variables so each service receives:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`

(Use Railway **Reference** to the Postgres plugin variables.)

### Web (`@challenge/web`)

- `VITE_API_URL=https://<api-gateway-public-url>`
- `VITE_WEBSOCKET_URL=https://<notifications-public-url>`

### API gateway

- `AUTH_SERVICE_HOST`, `AUTH_SERVICE_PORT`
- `TASKS_SERVICE_HOST`, `TASKS_SERVICE_PORT`
- `JWT_SECRET` (aligned with auth/notifications)
- `CORS_ORIGINS=https://challengeweb-production.up.railway.app` (or your real web URL)

### Tasks and notifications

- `RABBITMQ_URI` (Railway RabbitMQ or shared broker)

---

## Related files

- `.env.railway.example` — placeholders only
- `.env.railway.local` — your secrets (gitignored)
- `docker-compose.railway-db.yml` — override for Railway `DB_*`
- `scripts/dev-backend-railway-db.sh` — validates env and starts the stack
- `LOCAL_WITH_RAILWAY_DB.md` — supplementary notes; this doc is the primary entry


---

## Source: `PROJECT_ANALYSIS_REPORT.md`

# Project analysis report

**Scope:** Static inspection of the repository layout, configuration, and selected source files. No runtime tests were executed. No application code was modified.

**Reference docs read:** `PROJECT_RULES.md`, `HACKATHON_CASE_REQUIREMENTS.md`, `I18N_IMPLEMENTATION_PLAN.md`, `DEVELOPMENT_TODO.md`, `README_IMPROVEMENT_PLAN.md`, root `package.json`, `docker-compose.yml`, `README.md` (header and architecture sections).

---

## 1. Detected frontend framework

- **React 19** with **TypeScript**
- **Vite 7** as the build/dev server (`apps/web/package.json`, scripts `vite`, `vite build`)
- **TanStack Router** for routing (`@tanstack/react-router`)
- **TanStack Query** for server state (`@tanstack/react-query`)
- **Tailwind CSS 4** (`tailwindcss`, `@tailwindcss/vite`)
- **@dnd-kit** for drag-and-drop on the board
- **socket.io-client** for WebSocket connectivity to the notifications service

---

## 2. Detected backend framework

- **NestJS** (Node 20 in Dockerfiles; microservice `ClientProxy` / `MessagePattern` / `EventPattern` usage)
- **Monorepo** managed with **npm workspaces** and **Turborepo** (root `package.json`, `turbo` devDependency)
- Deployable apps under `apps/`:
  - `api-gateway` — HTTP REST entry
  - `auth-service` — TCP microservice + HTTP health
  - `tasks-service` — TCP microservice + HTTP health + RabbitMQ client
  - `notifications-service` — HTTP + WebSocket + RabbitMQ consumer

---

## 3. Detected database

- **PostgreSQL** — `docker-compose.yml` service `db` uses image `postgres:17.5-alpine3.21`
- **ORM:** **TypeORM** (task entity decorators; root dependencies include `typeorm`)
- **Schema isolation:** Per-service PostgreSQL schemas (`auth_service`, `task_service`, `notification_service`) as described in `README.md`

---

## 4. Detected real-time technology

- **Socket.IO** — Server: NestJS `@WebSocketGateway` in notifications service (`apps/notifications-service` compiled output references `socket.io`; gateway uses JWT auth via handshake). Client: `socket.io-client` in `apps/web/src/hooks/useWebSocket.ts`, env **`VITE_WEBSOCKET_URL`** (compose default `http://localhost:3004`).
- **Purpose today:** Push **notification** payloads and drive **toasts** + selective **React Query invalidation** (e.g. comment events). It is **not** the same as full live mirroring of the tasks query cache for every board change (see §15 and §16).

---

## 5. Detected queue / message broker technology

- **RabbitMQ** — `docker-compose.yml` service `rabbitmq` (`rabbitmq:3.13-management-alpine`), ports `5672` / `15672`, default credentials `admin` / `admin`
- **NestJS RMQ transport** — `tasks-service` registers `NOTIFICATION_SERVICE` with `Transport.RMQ` and queue `notification_queue` (`apps/tasks-service/src/task/task.module.ts`)
- **Kafka:** No application-level Kafka configuration was found under `apps/` source trees in this pass (broker choice is **RabbitMQ** for inter-service async messaging in this repo).

---

## 6. Main folders

| Path | Role |
| ---- | ---- |
| `apps/web/` | React SPA (Kanban UI, auth pages, WebSocket hook) |
| `apps/api-gateway/` | HTTP API aggregating calls to auth/tasks microservices |
| `apps/auth-service/` | Users, JWT, refresh tokens |
| `apps/tasks-service/` | Tasks, comments, history; emits RMQ events toward notifications |
| `apps/notifications-service/` | Consumes RMQ events; persists notifications; Socket.IO gateway |
| `packages/types/` | Shared DTOs, enums, payloads |
| `packages/exceptions/` | Shared RPC/HTTP exceptions |
| `packages/typescript-config/` | Shared TS configs |
| `packages/eslint-config/` | Shared lint config |
| `scripts/` | Root utilities (e.g. `seed.ts` referenced from root `package.json`) |
| Root | `docker-compose.yml`, Turborepo root, workspace `package.json` |

---

## 7. Main entry files

| Area | Entry / bootstrap |
| ---- | ----------------- |
| Web app | `apps/web/src/main.tsx` → `App`, `QueryProvider`, `AuthProvider` |
| Web routing | `apps/web/src/router.tsx` (TanStack Router: `/`, `/login`, `/register`, `/kanban`) |
| API gateway | `apps/api-gateway/src/main.ts` |
| Auth service | `apps/auth-service/src/main.ts` |
| Tasks service | `apps/tasks-service/src/main.ts` |
| Notifications service | `apps/notifications-service/src/main.ts` |

---

## 8. Existing Kanban-related files (representative)

- `apps/web/src/pages/KanbanPage.tsx` — Board page shell, header, create button, task list wiring
- `apps/web/src/components/KanbanBoard.tsx` — Columns by `TaskStatus`, drag-and-drop, column labels
- `apps/web/src/components/CreateTaskDialog.tsx` — Task creation UI
- `apps/web/src/components/TaskDetailDialog.tsx`, `TaskDetailsPanel.tsx`, `TaskDetailHeader.tsx` — Task detail UX
- `apps/api-gateway/src/tasks/` — HTTP controllers delegating to tasks microservice (pattern observable in repo layout; not every line audited)

---

## 9. Existing task-related files (representative)

**Backend**

- `apps/tasks-service/src/task/task.controller.ts` — RPC patterns: `task.create`, `task.update`, `task.delete`, `task.find_all`, etc.
- `apps/tasks-service/src/task/task.service.ts` — Core CRUD, history, assignment, comment orchestration; **RabbitMQ emits** for notifications
- `apps/tasks-service/src/task/entity/task.entity.ts` — TypeORM `Task` entity
- `apps/tasks-service/src/comment/` — Comment entity and service
- `apps/tasks-service/src/history/` — Task history entity and audit trail usage

**Frontend**

- `apps/web/src/services/tasks.service.ts` — HTTP client for tasks via gateway
- `apps/web/src/hooks/useTasks.ts` — Queries and mutations with `invalidateQueries` on success

**Shared contracts**

- `packages/types/dto/tasks/*.ts` — Create/update/response DTOs and payloads
- `packages/types/enums/index.ts` — `TaskStatus`, `TaskPriority`, `ActionType`

---

## 10. Existing notification-related files (representative)

- `apps/notifications-service/src/notifications/notifications.controller.ts` — `@EventPattern('task.assigned' | 'task.updated' | 'task.comment')`
- `apps/notifications-service/src/notifications/notifications.service.ts` — Persists notifications; builds **Portuguese** message strings; invokes gateway
- `apps/notifications-service/src/notifications/notifications.gateway.ts` — Socket.IO gateway (see dist/types in repo)
- `apps/web/src/hooks/useWebSocket.ts` — Connects with JWT; listens for `task:created`, `task:updated`, `task:assigned`, `comment:new`; shows **Sonner** toasts (Portuguese strings)
- `apps/web/src/components/ui/sonner.tsx` — Toast host

---

## 11. Existing authentication-related files (representative)

- `apps/web/src/pages/Login.tsx`, `Register.tsx`
- `apps/web/src/contexts/AuthContext.tsx`, `auth-context.ts`
- `apps/web/src/hooks/useAuth.ts`
- `apps/web/src/services/auth.service.ts`
- `apps/auth-service/src/` — NestJS auth domain (not fully enumerated here)
- `apps/api-gateway/src/auth/` — HTTP auth surface toward the gateway
- Router guards in `apps/web/src/router.tsx` — redirect unauthenticated users from `/kanban`

---

## 12. Existing language / i18n-related files

- **No** `i18next`, `react-i18next`, or project `i18n/` directory was found under `apps/web/src` (search: `i18n`, `i18next`, `useTranslation` → no matches).
- **Locale formatting:** `KanbanBoard.tsx` imports **`date-fns/locale` `ptBR`** for displayed dates — couples visible formatting to Portuguese locale.
- **Plan-only docs:** `I18N_IMPLEMENTATION_PLAN.md`, `.cursor/rules/i18n-rules.mdc`, `PROJECT_RULES.md` (policy) describe target **en / ru / tr** but implementation is **not** present in code from this audit.

---

## 13. Current UI language problem

- **README** and marketing text are largely **Portuguese** (e.g. subtitle “Sistema de Gerenciamento…”, “Visão Geral”).
- **Web UI strings** mix **English** (“Task Board”) with **Portuguese** (column titles “A Fazer”, “Conectado”, buttons “Sair”, “Nova Tarefa”, logout toast, WebSocket toasts and errors in `useWebSocket.ts`).
- **Notifications service** composes user-visible titles and bodies in **Portuguese** (`notifications.service.ts`).
- **Swagger / DTO documentation** in `packages/types` uses **Portuguese** `@ApiProperty` examples and descriptions (e.g. `CreateTaskDto`).
- **Target languages** per project rules are **English (default), Russian, Turkish** — current state is **misaligned** and **not centralized** in translation files.

---

## 14. Current hardcoded visible text problem

- Visible strings are embedded directly in **React components** (`KanbanPage.tsx`, `KanbanBoard.tsx`, dialogs, etc.) and in **`useWebSocket.ts`** toast calls.
- **Column labels** are a local `STATUS_LABELS` map in `KanbanBoard.tsx`, not translation keys.
- **Notification content** is generated server-side with string templates in Portuguese.
- No single **locale JSON** or key namespace exists yet; parity **en / ru / tr** cannot be achieved without structural work.

---

## 15. Missing features compared to hackathon requirements

Cross-check with `HACKATHON_CASE_REQUIREMENTS.md` (high level):

| Requirement area | Observation |
| ---------------- | ----------- |
| **Custom board columns / admin configuration** | Columns are fixed to `TaskStatus` enum (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`) in `KanbanBoard.tsx`. No admin UI or dynamic column configuration was identified. |
| **Task field: tags** | `Task` entity has **no** `tags` column; `CreateTaskDto` has **no** tags field — **tags are not modeled** end-to-end. |
| **Task field: explicit “tags” automation** | Cannot be demonstrated without tags. Priority `URGENT` exists as enum value but not same as hackathon “tag-based flags” unless mapped separately. |
| **Automation (rule-based moves, deadline reactions)** | Notifications exist for some events; **no** configurable rule engine or scheduled deadline workers were identified in this static pass. |
| **Event-driven: all four mandatory events as published + consumed** | RMQ handlers in notifications subscribe to **`task.assigned`**, **`task.updated`**, **`task.comment`** only. **`notifyTaskCreated`** exists in service but **no** `@EventPattern('task.created')` in controller; **`task.service` `create()`** does not emit a creation event in the audited snippet. **Delete path** — no Rabbit emit found in audited `delete()` flow. |
| **Queue ingestion pipeline (dedupe, validation, enrichment, DLQ narrative)** | RabbitMQ is used for **notification fan-out**, not audited as a full **inbound task** pipeline with deduplication/enrichment stages. REST/gateway task creation exists; **Kafka-style** ingress is **out of scope** in repo. |
| **Real-time: other users see board updates without refresh** | WebSocket handlers in `useWebSocket.ts` **do not** `invalidateQueries` for `["tasks"]` on `task:created` / `task:updated` (only `comment:new` touches history queries). Mutations invalidate locally **for the acting user**, but **observers may rely on refetch intervals, focus refetch, or manual refresh** — **gap vs strict “instant board sync”**. |
| **i18n (en, ru, tr)** | Not implemented (see §12–14). |
| **Admin capabilities** | No dedicated **admin** module for columns, automation rules, notification policies, or inbound flow control was identified in `apps/web` naming or obvious routes. |
| **Deployment proof** | `DEVELOPMENT_TODO` / README discuss Docker; **no** captured production URL or deployment checklist completion in repo from this audit. |

Items that **appear** substantially present: authenticated web app, Kanban columns matching default statuses, task CRUD API surface via gateway/RPC pattern, drag-and-move with optimistic patterns in board code path, histories and comments, PostgreSQL persistence, RabbitMQ + event consumers for some task-related signals, Socket.IO notifications.

---

## 16. Risks before editing

- **Realtime + React Query:** Adding `invalidateQueries` on socket events risks **request storms** or **jitter** unless debounced; must not break existing mutation flows.
- **Microservice contracts:** Changing DTOs or event names affects **gateway**, **tasks-service**, and **notifications-service** simultaneously.
- **Docker dev mounts:** Compose bind-mounts repo into services with anonymous `node_modules` volume — local **workspace package builds** (`packages/types`, `packages/exceptions`) must stay consistent with container runtime (documented in prior project context).
- **JWT + WebSocket:** `useWebSocket` ties reconnect to **refresh token** path; changes to auth storage or refresh semantics can **silently break** notifications.
- **Language migration:** Moving strings to i18n will touch **many UI files**; risk of **mixed locales** during transition if not done screen-by-screen.
- **Non-durable RMQ queue:** `queueOptions: { durable: false }` in tasks module — **may conflict** with “no message loss” storytelling unless framed honestly or improved.

---

## 17. Recommended next implementation step

1. **Close the highest-impact hackathon gap:** ensure **multi-user board synchronization** by invalidating or patching the **`["tasks"]`** React Query cache on relevant Socket.IO events (`task:updated`, `task:created`, and any future delete broadcast), with throttling if needed — **without** altering core drag-and-drop mutation semantics.
2. In parallel or next:** begin i18n scaffolding** per `I18N_IMPLEMENTATION_PLAN.md` (English keys first, then `ru`/`tr`), replacing Portuguese UI strings incrementally.
3. **Align backend notification events** with the hackathon list (wire **`task.created`** / **`task.deleted`** or document honestly as partial) before claiming full event-driven coverage in README.

---

## Document control

- **Generated:** repository analysis only; verify behavior in a running environment before marking related `DEVELOPMENT_TODO.md` implementation items complete.


---

## Source: `PROJECT_RULES.md`

# Project rules — Kanban microservices (hackathon)

This document aligns **human engineers** and **Cursor / AI tooling** with how we evolve this codebase. Detailed agent-focused rules live in `.cursor/rules/*.mdc`.

---

## 1. Purpose

Preserve a **professional, jury-ready hackathon demo** while we add features—especially **internationalization**. Work must stay **incremental**, **reviewable**, and safe for authentication, realtime, and Kanban behavior.

---

## 2. Language policy

### 2.1 Code and repository

| Artifact | Language |
| -------- | -------- |
| Application source code | **English** |
| Identifiers (variables, functions, classes, types) | **English** |
| File and directory names | **English** |
| Commit messages | **English** |
| Internal developer docs, ADRs in repo, PR bodies | **English** |

### 2.2 User interface (end users)

- **Visible UI strings** must not live as hard-coded literals scattered in React components once i18n is in place for a screen.
- The product targets **three** UI languages:

  | Locale code | Language | Notes |
  | ----------- | -------- | ----- |
  | `en` | English | **Default** on first visit |
  | `ru` | Russian | Full parity expected for keys |
  | `tr` | Turkish | Full parity expected for keys |

- A **language selector** in the interface is planned; implementations should persist the user choice (e.g. local storage) without breaking SSR/hydration assumptions if applicable.
- **Portuguese** copy that exists today must be phased out from the codebase as the **primary** UX language—replaced by **English authoring** plus **Russian** and **Turkish** translation resources. Removing Portuguese is **content migration**, not arbitrary refactoring; do it in dedicated, small commits or PR slices.

---

## 3. Comments and documentation noise

- **Default: no comments in code.** Do not add comments “for clarity,” placeholders, TODO blocks, block dividers `---`, or restatements of obvious control flow.
- **When the stakeholder explicitly requests comments**, add short, factual **English** comments only where ambiguity or non-obvious invariants genuinely exist.
- `PROJECT_RULES.md` and `.cursor/rules/*` **are documentation**, not runtime code—they should stay clear and actionable.

---

## 4. Change discipline

### 4.1 What to avoid

- Random refactors, wide renames, or style-only churn across unrelated files.
- Rewriting entire modules “for cleanliness” unless there is **no safer minimal fix**.
- Installing dependencies without documenting **why** they are necessary and why simpler options were rejected.

### 4.2 What to prefer

- **Minimal diffs** that solve one problem clearly.
- Reuse existing patterns (Nest modules, hooks, Axios layer, Turborepo layout) unless there is an agreed architectural migration.
- **Production-realistic** choices: predictable error handling, no debug logs in demo paths unless debugging with the team.

---

## 5. Non-regression areas (explicit)

Treat the following as **high-risk**. Changes that touch these areas must be **narrow** and **verified**:

1. **Authentication** — JWT access/refresh, token storage assumptions, guarded routes.
2. **Routing** — React Router paths, loaders, redirects.
3. **API integration** — gateway base URL env, payloads, optimistic updates aligned with backend contracts.
4. **Realtime** — notifications / WebSockets / RabbitMQ-backed flows as exposed to the client.
5. **Kanban** — board layout, drag-and-drop, ordering, optimistic UI for moves.
6. **Tasks CRUD & lifecycle** — create, edit, delete, assign, status changes.
7. **Notifications** — creation triggers, unread state, realtime push.

Breaking any of these for a stylistic preference is unacceptable unless the ticket is explicitly to fix a defect there.

---

## 6. Dependencies

- Do not leave **unused** imports, variables, or packages.
- Any new dependency must:

  - solve a concrete problem aligned with roadmap (e.g. i18n), and  
  - be lightweight and commonly maintained—**explain the rationale** when proposing `package.json` changes.

---

## 7. Internationalization workflow (planned implementation)

Until i18n is fully wired:

1. Inventory hardcoded strings (page by page or route by route).
2. Introduce namespaces and keys consistent with UX domains (`auth.*`, `board.*`, `task.*`, …).
3. Replace literals with lookups from the chosen i18n layer.
4. Add `en`, `ru`, `tr` resource files/folders—**no orphaned keys** across shipped screens.
5. Add a compact **language switcher** and persist preference.
6. Migrate legacy Portuguese snippets to translations as separate, reviewable steps.

Technical choice of library is left to implementing tasks (**justify**—e.g. `i18next` ecosystem vs alternatives).

---

## 8. Collaboration workflow (agents and humans)

For **every task**, collaborators should:

1. **Inspect** relevant files before editing (no blind patches).
2. Author a **checkbox TODO list** before substantive changes and **update checkboxes as work progresses**—never skip tracking.
3. Avoid **scope creep**.
4. On completion, provide a short report:

   - **What changed** (outcomes).  
   - **Which files/directories**.  
   - **Manual QA checklist** (auth, Kanban moves, realtime, APIs as relevant).  
   - **Next recommended step.**

Cursor-specific automation of §8 lives in `.cursor/rules/workflow-rules.mdc`.

---

## 9. Where rules live

| Path | Audience |
| ---- | -------- |
| `.cursor/rules/project-rules.mdc` | Cursor — core constraints (always applied) |
| `.cursor/rules/workflow-rules.mdc` | Cursor — process (always applied) |
| `.cursor/rules/i18n-rules.mdc` | Cursor — i18n when editing web TS/TSX |
| `PROJECT_RULES.md` | Humans & onboarding |

---

## 10. Versioning mindset

These rules prioritize **maintainability and demo credibility** over speed-of-hacking. When in doubt: **smaller PR**, **no surprise behavior change**, **English code**, **string keys for UI**, protect **Kanban + auth + realtime**.


---

## Source: `RAILWAY_DEPLOY_RU.md`

# Деплой на Railway (монорепозиторий)

Из этой среды (Cursor-агент без браузера и без твоего `RAILWAY_TOKEN`) **невозможно** выполнить `railway login`: CLI пишет «Cannot login in non-interactive mode». Ниже — то, что уже проверено локально и что сделать тебе **один раз**, после чего можно запускать скрипт из консоли.

## Что уже сделано автоматически

- Проверена установка CLI: `railway 4.30.5` (Homebrew).
- `railway whoami` без авторизации: **Unauthorized**.

## Самый простой путь: Docker Compose в Railway

Railway умеет импортировать `docker-compose.yml` на холст проекта (перетащить файл). См. раздел в документации [Dockerfiles — Docker compose](https://docs.railway.com/builds/dockerfiles).

1. Создай проект на [railway.app](https://railway.app).
2. Перетащи в проект файл **`docker-compose.yml`** из корня репозитория.
3. Проверь сгенерированные сервисы, переменные и порты; при необходимости добавь **PostgreSQL** и **RabbitMQ** из каталога шаблонов, если импорт их не создал как нужно.
4. Для **фронта в браузере** задай сборочные `VITE_API_URL` и `VITE_WEBSOCKET_URL` на **публичные HTTPS/wss URL** сервисов gateway и notifications (не localhost).
5. В **api-gateway** нужно разрешить origin фронта в CORS (`apps/api-gateway/src/main.ts`) — иначе браузер заблокирует запросы к API.

## Путь через CLI (после входа в аккаунт)

### Шаг 1 — один раз вручную в твоём терминале (нужен браузер)

```bash
railway login
```

Следуй открывшейся авторизации. Проверка:

```bash
railway whoami
```

Альтератива без браузера — [Account tokens](https://railway.app/account/tokens), затем:

```bash
export RAILWAY_TOKEN="твой_токен"
railway whoami
```

### Шаг 2 — связать проект и сервис

Создай проект в веб-интерфейсе (или через `railway init`), затем из корня репозитория:

```bash
cd ~/Desktop/kanban-microservice-main
railway link -p <PROJECT_ID> -s <SERVICE_NAME>
```

`<PROJECT_ID>` и сервис можно взять из URL в дашборде Railway.

Для **каждого** микросервиса в том же репозитории задаётся свой сервис: либо отдельные `railway link` с разными `-s`, либо используй импорт Compose (см. выше).

### Шаг 3 — указать Dockerfile в корне монорепо

В переменных **каждого** сервиса в Dashboard задай:

- `RAILWAY_DOCKERFILE_PATH=apps/api-gateway/Dockerfile` (и аналогично для остальных путей).

Или добавь конфиг через [config as code](https://docs.railway.com/reference/config-as-code) с `build.dockerfilePath` (если включаете файл в том же репо для этого сервиса).

### Шаг 4 — деплой

```bash
cd ~/Desktop/kanban-microservice-main
railway up --detach
```

С флагом `-s`:

```bash
railway up -s api-gateway --detach
```

Подробнее: [Deploying with the CLI](https://docs.railway.com/cli/deploying).

## Скрипт в репозитории

`scripts/railway-check.sh` — проверяет, что ты авторизован (`railway whoami`), и напоминает про `railway link` / `railway up`. Запуск из корня:

```bash
./scripts/railway-check.sh
```

## Вывод

| Действие | Кто выполняет |
|----------|----------------|
| `railway login` или `RAILWAY_TOKEN` | Ты (интерактивно один раз или токен) |
| Создание проекта и сервисов / импорт Compose | Ты в Railway UI |
| `railway link`, `railway up` после входа | Можешь запускать в консоли по этой памятке |
| Полный деплой «за тебя» без доступа к аккаунту | Невозможно из текущего агента Cursor |

Supabase для этого проекта не требуется, если PostgreSQL живёт на Railway или в вашем Compose-стеке.


---

## Source: `RAILWAY_DEPLOY_VARIABLES_TO_SET.md`

# Railway: deploy variables checklist

Set these in the Railway dashboard **per service** (or reference a shared Postgres / RabbitMQ plugin). Align **`JWT_SECRET`** across **api-gateway**, **auth-service**, and **notifications-service**.

## Web (`@challenge/web`)

- `VITE_API_URL` = `https://<api-gateway-public-url>`
- `VITE_WEBSOCKET_URL` = `https://<notifications-service-public-url>`

## API gateway (`@challenge/api-gateway`)

- `AUTH_SERVICE_HOST`, `AUTH_SERVICE_PORT`
- `TASKS_SERVICE_HOST`, `TASKS_SERVICE_PORT`
- `JWT_SECRET`
- `CORS_ORIGINS` = `https://challengeweb-production.up.railway.app` (or your production web URL)

## Postgres (same logical database for all services below)

Reference Railway Postgres variables so each service receives:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `DB_SSL` = `true` when the driver must use TLS to Railway Postgres

## Auth service

- `DB_*` and `DB_SSL` (as above)
- `JWT_SECRET`

## Tasks service

- `DB_*` and `DB_SSL`
- `RABBITMQ_URI`

## Notifications service

- `DB_*` and `DB_SSL`
- `JWT_SECRET`
- `RABBITMQ_URI`

If the CLI cannot list your project, use the Railway UI to confirm each variable on each service.


---

## Source: `RAILWAY_MANUAL_VALUES_NEEDED.md`

# Railway Postgres values (manual entry)

Use this if **Railway CLI** is not installed, you are not logged in (`railway login`), or the project is not linked (`railway link`).

Copy from **Railway dashboard → your project → Postgres → Variables** or **Connect / Data** (use the **public** connection if your app runs on your machine or in Docker on your Mac).

Fill `.env.railway.local` (create from `.env.railway.example`):

| Variable | Where to copy from |
|----------|---------------------|
| `RAILWAY_DB_HOST` | `PGHOST`, or the hostname from `DATABASE_PUBLIC_URL` (often `*.proxy.rlwy.net` for external access) |
| `RAILWAY_DB_PORT` | `PGPORT`, or the port from the same URL |
| `RAILWAY_DB_USER` | `PGUSER` |
| `RAILWAY_DB_PASS` | `PGPASSWORD` |
| `RAILWAY_DB_NAME` | `PGDATABASE` (often `railway`) |

**Public vs internal host**

- **Local Docker on your Mac** connecting **out** to Railway must use the **public / proxy** host and port (`DATABASE_PUBLIC_URL`), not `*.railway.internal`.
- **`DB_SSL=true`** is usually required for the public proxy endpoint.

Optional:

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Align with `@challenge/api-gateway` and services on Railway if you share tokens |
| `RABBITMQ_URI` | Leave empty to use local Docker RabbitMQ in `npm run dev:railway-db` |
| `DB_SSL` | `true` when using Railway public Postgres through TLS |

Then run:

```bash
npm run dev:railway-db
```

Never commit `.env.railway.local`.

#### Automated alternative

If CLI works:

```bash
npm run sync:railway-env
```

This writes `.env.railway.local` from Railway (does not print secrets).


---

## Source: `RAILWAY_RUNTIME_CONNECTION_PLAN.md`

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


---

## Source: `RBAC_ADMIN_PANEL_REPORT.md`

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


---

## Source: `RBAC_READY_TO_TEST_REPORT.md`

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


---

## Source: `RBAC_REGISTRATION_APPROVAL_READY_REPORT.md`

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


---

## Source: `README.md`

# Платформа Kanban на микросервисах

Демо-приложение для хакатона: **команды, доски Kanban, задачи, уведомления в реальном времени** и распределённая архитектура с отдельными сервисами и брокером сообщений.

## Живая версия (деплой)

**Вход в приложение:** [https://challengeweb-production.up.railway.app/login](https://challengeweb-production.up.railway.app/login)

---

## Что это за проект

Это **fullstack-система управления задачами** в стиле Kanban. Пользователь проходит аутентификацию, работает с досками и карточками задач (перетаскивание между колонками, статусы, приоритеты, комментарии), получает **уведомления без перезагрузки страницы** через WebSocket.

Бэкенд построен как **набор микросервисов** за **API-шлюзом**: клиент общается только с шлюзом по HTTP, а сервисы между собой используют **синхронные TCP/RPC-вызовы** там, где нужен быстрый ответ, и **очереди RabbitMQ** — для асинхронных событий (например, цепочка «задача изменилась → уведомление»).

Данные в **PostgreSQL** логически разделены **схемами по сервисам** (модель «отдельная БД на сервис» без запуска трёх отдельных инстансов Postgres в демо-окружении).

---

## Как устроена работа (кратко)

1. **Фронтенд (React + Vite)** отправляет запросы на **API Gateway** (REST).
2. **Gateway** проксирует вызовы в **Auth** и **Tasks** по внутреннему TCP.
3. **Tasks** при значимых событиях публикует сообщения в **RabbitMQ**.
4. **Notifications** подписан на очередь, сохраняет уведомления и **пушит их в браузер** через **Socket.IO**.
5. **JWT** (access + refresh) выдаётся сервисом аутентификации; шлюз проверяет доступ к защищённым маршрутам.

Такой расклад показывает жюри **границы контекстов**, **асинхронную связь** и **реалтайм UX** в одном продукте.

---

## Технологии

| Слой | Стек |
|------|------|
| Монорепозиторий | npm workspaces, **Turborepo** |
| API-шлюз и сервисы | **NestJS**, TypeScript, **TypeORM**, class-validator |
| Сообщения | **RabbitMQ** |
| База данных | **PostgreSQL** 17 |
| Реалтайм | **Socket.IO** |
| Фронтенд | **React**, **Vite**, **TanStack Query**, Tailwind, **@dnd-kit** (drag-and-drop Kanban) |
| Контейнеризация | **Docker**, **Docker Compose** |
| Документация API | **Swagger** на шлюзе (`/api/docs`) |

---

## Запуск локально

### Требования

- **Docker Desktop** (или другой демон Docker) и **Docker Compose v2** (`docker compose`, не обязательно устанавливать Compose отдельно)
- **Git**
- для шага с seed с машины разработчика: **Node.js 18+** и **npm**

Отдельные `.env` в корне репозитория для холодного старта **не нужны**: переменные для контейнеров заданы в `docker-compose.yml`.

### Команды (холодный старт с нуля)

```bash
git clone https://github.com/bekirs01/kanban-microservice.git
cd kanban-microservice

docker compose up -d --build
```

Первый запуск обычно занимает **несколько минут**: сборка образов и прохождение health checks у `db` и `rabbitmq`. Убедиться, что всё поднялось:

```bash
docker compose ps
```

В колонке **State** у сервисов `db`, `rabbitmq`, `auth-service`, `tasks-service`, `notifications-service`, `api-gateway`, `web` должно быть **running** (или **healthy**, если отображается). Проверка шлюза с хоста:

```bash
curl -sSf http://localhost:3001/api/health
```

После этого откройте в браузере **http://localhost:3000** — страница логина или приложение должны открываться.

Логи при необходимости:

```bash
docker compose logs -f
```

### Опционально: тестовые данные (seed)

Сначала дождитесь успешного старта стека (см. выше). Затем **с хоста** (не внутри контейнера), из корня репозитория:

```bash
npm install
DB_HOST=localhost DB_PORT=5433 DB_USER=postgres DB_PASS=password DB_NAME=challenge_db npm run seed
```

Порт **5433** обязателен: в `docker-compose` PostgreSQL проброшен на хост как `5433:5432`. Без этого seed попытается подключиться к `5432` и завершится с ошибкой.

В seed создаются пользователи, например **`admin@jungle.gg`** / **`123456`** (см. вывод скрипта в терминале).

В **PowerShell (Windows)** переменные для одной команды задаются так:

```powershell
$env:DB_HOST="localhost"; $env:DB_PORT="5433"; $env:DB_USER="postgres"; $env:DB_PASS="password"; $env:DB_NAME="challenge_db"; npm run seed
```

---

## Адреса после локального запуска

| Назначение | URL |
|------------|-----|
| Веб-приложение | http://localhost:3000 |
| API Gateway (REST) | http://localhost:3001 |
| Swagger (документация API) | http://localhost:3001/api/docs |
| RabbitMQ Management | http://localhost:15672 (логин `admin`, пароль `admin`) |
| WebSocket (уведомления; порт сервиса) | хост подключается к `http://localhost:3004` (как в `.env.example` фронтенда) |

**PostgreSQL** с хоста: `localhost:5433` (пользователь `postgres`, пароль `password`, БД `challenge_db`).

---

## Устранение типичных проблем

- **Порт занят** — освободите порты `3000`, `3001`, `3002`–`3004`, `5433`, `5672`, `15672` или измените маппинг в `docker-compose.yml`.
- **Сервисы перезапускаются** — дождитесь готовности `db` и `rabbitmq`; при необходимости: `docker compose logs db rabbitmq`.
- **`npm run seed` не подключается к БД** — проверьте, что контейнер `db` запущен и используется **`DB_PORT=5433`** (см. блок про seed выше).
- После изменений инфраструктуры иногда помогает чистый перезапуск: `docker compose down -v` и снова `up` (данные в volume будут сброшены).

---

## Архив документации

Отчёты, планы и служебные заметки (раньше в корне репозитория) собраны в одном файле: **`DOCUMENTATION_ARCHIVE.md`**. Перегенерация после правок локальных Markdown: `./scripts/combine-markdown.sh`.

---

*Проект подготовлен для демонстрации на хакатоне: архитектура, стек и рабочий деплой доступны по ссылке выше.*


---

## Source: `README_IMPROVEMENT_PLAN.md`

# README Improvement Plan

This document plans a future revision of the repository **`README.md`**. It does **not** replace the current README yet and contains **no application code** changes.

---

## Purpose

Produce a **single authoritative README** that satisfies hackathon expectations: jury clarity, developer onboarding, honest feature scope, reproducible commands, and alignment with **`HACKATHON_CASE_REQUIREMENTS.md`**, **`PROJECT_RULES.md`**, and **`I18N_IMPLEMENTATION_PLAN.md`**.

---

## Planned README structure

When the README is rewritten, it should include the following sections **in a logical order** (headings may vary; content must be present).

### 1. Project title

- Clear product name (e.g., “Kanban Microservices Platform”).
- Optional one-line badge row only if maintained (avoid dead links).

### 2. Short project description

- Two to four sentences: what the system is, primary user value, and architectural style (microservices, event-driven, realtime).
- Audience: technical reader who has sixty seconds.

### 3. Hackathon case summary

- Condensed narrative of the case: Kanban board comparable to Jira/Trello, realtime collaboration, notifications, optional queue ingestion, automation, i18n roadmap.
- Reference the full spec: link to **`HACKATHON_CASE_REQUIREMENTS.md`**.

### 4. Main features

- Bullet list of **user-visible** and **operator-visible** capabilities.
- Split into **implemented** vs **planned / partial** where honesty matters (see README Quality Rules).

### 5. Architecture overview

- Diagram (Mermaid or static image) or numbered component list: web, API gateway, domain services, PostgreSQL, RabbitMQ, WebSocket path.
- Data flow: sync RPC vs async events (high level).
- Link to deeper doc if one exists.

### 6. Technology stack

- Table or grouped list: frontend (e.g., React, Vite), backend (NestJS), ORM, DB, broker, monorepo tool (Turborepo), containers.
- Versions only if pinned or critical for reproduction.

### 7. Real-time synchronization explanation

- How clients connect (e.g., Socket.io / gateway path).
- Which domain changes trigger pushes (task CRUD, moves, notifications).
- What “instant” means (optimistic UI vs server ack) and how reconnect is handled at a high level.

### 8. Event-driven architecture explanation

- Published events: task created, updated, moved, deleted (and any others).
- Which service publishes, which consumes, and why decoupling matters for notifications or future workers.

### 9. Queue processing explanation

- Broker in use (e.g., RabbitMQ)—state if Kafka is **not** used to avoid confusion.
- Inbound paths: REST vs queue consumer; stages: validation, deduplication, enrichment, error handling / DLQ narrative.
- Explicitly mark **not implemented** items if the code only covers a subset.

### 10. Automation rules explanation

- What rules exist (e.g., notify on move); how tags and deadlines are intended to behave.
- Distinguish **live behavior** from **roadmap** aligned with hackathon case.

### 11. Internationalization explanation

- Target locales: English (default), Russian, Turkish.
- How language is selected and persisted; link to **`I18N_IMPLEMENTATION_PLAN.md`** until fully implemented.
- Note replacement of legacy Portuguese UI strings as a migration item if still applicable.

### 12. Environment variables

- Table: variable name, purpose, default, required in prod vs dev.
- Separate blocks for **web** (Vite-prefixed public vars), **gateway**, **auth**, **tasks**, **notifications**, **database**, **broker**.
- Never commit secrets; document `.env.example` if introduced.

### 13. Local setup instructions

- Prerequisites: Node version, package manager, optional Colima/Docker Desktop.
- `git clone`, `cd`, `npm install` (or workspace equivalent).
- Order of operations if packages must be built before apps.

### 14. Docker setup instructions (if Docker exists)

- Reference `docker-compose.yml` (or equivalent).
- Commands: `docker compose up -d --build`, health wait, log tailing.
- Port map summary and known conflicts (3000–3004, 5432, 5672, 15672).
- Note **Colima** or Docker Desktop requirement on macOS where relevant.

### 15. How to run frontend

- Exact command(s) for dev and production build.
- Workspace name (`@challenge/web` or equivalent).

### 16. How to run backend

- Per-service or unified command; clarify gateway vs microservices startup.
- Migration note if services run migrations on boot.

### 17. How to run database / message broker (if needed)

- Docker service names; local connection strings; management UI URL and default credentials if dev-only.
- Optional: seed script command if present.

### 18. How to test the real-time demo

- Step-by-step minimal repro: two browsers, same board, move task, expect notification.
- Troubleshooting: websocket URL env, CORS, mixed HTTP/HTTPS.

### 19. Deployment instructions

- Target platform options (VPS, PaaS, container host).
- Build artifacts, env injection, scaling caveats (stateless vs broker).
- Separate frontend static hosting vs backend services if applicable.

### 20. Demo scenario for the jury

- Short scripted walkthrough (can mirror “Best Jury Demo Flow” below in condensed form).
- Expected timing (e.g., five to eight minutes).

### 21. Known limitations

- Explicit gaps: missing automation, partial i18n, no Kafka, single-region, schema-in-one-DB dev pattern, etc.
- Anything that could surprise evaluators if oversold.

### 22. Future improvements

- Ordered backlog: DLX, tracing, rate limiting, full automation engine, etc.—cross-reference hackathon roadmap.

---

## Best Jury Demo Flow

Use this as the **canonical live demo script** when presenting; the README should summarize or embed it.

1. Open the app in **two browser windows** (or normal + incognito).
2. **Log in as two different users** if authentication exists; otherwise state why single-user demo applies.
3. **Create a new task** from one window.
4. Show that the task **appears in real time** in the other window without refresh.
5. **Move the task** to another column in the first window.
6. Show that the **second browser updates instantly**.
7. **Add an urgent tag** (or equivalent priority/tag affordance).
8. Show an **automatic flag or notification** tied to that action if implemented; otherwise narrate as planned behavior without claiming it works.
9. **Trigger a task through API or queue** if implemented (curl example or documented producer).
10. Show **event-driven behavior** (notification consumer or audit trail) consistent with actual architecture.
11. **Switch UI language** among English, Russian, and Turkish **if implemented**; if not, point to `I18N_IMPLEMENTATION_PLAN.md` and README honesty rules.

---

## README Quality Rules

These constraints apply when editing **`README.md`**:

- The README must be written in **English**.
- The README must be **clear** for both **developers** (setup, architecture) and **jury members** (value, demo path).
- The README must **not exaggerate** capabilities that are not implemented.
- The README must **clearly separate** **implemented features** and **planned / partial features** (tables or labeled subsections work well).
- The README must include **exact run commands** (copy-paste safe, tested on the target OS or noted otherwise).
- The README must include **troubleshooting notes** (ports in use, unhealthy containers, migration failures, websocket connectivity).

---

## Execution checklist (for the future README rewrite)

When ready to implement this plan:

- [ ] Audit the codebase and mark each hackathon feature as implemented, partial, or missing.
- [ ] Draft README sections 1–22 using only verified facts.
- [ ] Add “Best Jury Demo Flow” (condensed) and link to **`HACKATHON_CASE_REQUIREMENTS.md`**.
- [ ] Verify every command in README on a clean clone (or document OS-specific deviations).
- [ ] Peer-review for overselling vs **`DEVELOPMENT_TODO.md`** status.
- [ ] Replace deprecated Portuguese references in diagrams/copy if diagrams are locale-specific.

---

## Note

Only **`README_IMPROVEMENT_PLAN.md`** was added in this step. The existing **`README.md`** remains unchanged until a follow-up task applies this plan.


---

## Source: `REALTIME_BOARD_SYNC_REPORT.md`

# Real-time Kanban board sync — report

## Summary

Cross-user board updates use **RabbitMQ** (`notifications_queue`) from **tasks-service** into **notifications-service**, which persists optional in-app notifications and **broadcasts Socket.IO** (`board:changed`, `task:moved`, per-user `task:*` events). The **web** app **debounces React Query invalidation** (`tasks` / `task` keys) and **mutes toasts** when `actorId` matches the logged-in user (from `localStorage.user`).

---

## Changed files

| Area | File |
|------|------|
| Types | `packages/types/payloads/notifications/task-notification.payload.ts` |
| Types | `packages/types/dto/notification/response-notification.dto.ts` |
| Tasks service | `apps/tasks-service/src/task/task.service.ts` |
| Notifications | `apps/notifications-service/src/notifications/notifications.controller.ts` |
| Notifications | `apps/notifications-service/src/notifications/notifications.service.ts` |
| Notifications | `apps/notifications-service/src/notifications/notifications.gateway.ts` |
| Notifications tests | `apps/notifications-service/src/notifications/notifications.service.spec.ts` |
| Frontend | `apps/web/src/hooks/useWebSocket.ts` |
| Tracking | `DEVELOPMENT_TODO.md` |

---

## RabbitMQ events (tasks-service → notifications_queue)

| Pattern | When |
|---------|------|
| `task.created` | After task save |
| `task.updated` | After update with history, and on unassign flow |
| `task.deleted` | Before row delete (snapshot in payload) |
| `task.assigned` | Assignee added (unchanged pattern name) |
| `task.comment` | New comment (existing) |

Payload: `TaskNotificationPayload` with required **`actorId`**, optional `creatorId`, `timestamp`, **`recipients`**, **`task`** snapshot (id, title, status, assignees, creatorId, priority, deadline ISO), **`action`** (`ActionType`).

---

## Socket.IO events (notifications-service → clients)

| Event | Audience | Purpose |
|-------|----------|---------|
| `board:changed` | **All** connected clients | Triggers debounced invalidate of task queries |
| `task:moved` | **All** connected clients | Fired when payload `action` is `ActionType.STATUS_CHANGE` in `notifyTaskUpdated` |
| `task:created` | Per-recipient rooms | Toast + persists notification (assignees/other recipients) |
| `task:updated` | Per-recipient rooms | Toast + persists |
| `task:assigned` | Per-recipient rooms | Fixed from previous `task:updated` misuse for assigns |
| `task:deleted` | Per-recipient rooms | Toast + persists |
| `comment:new` | Per-recipient rooms | Unchanged semantics + board sync |

Broadcast DTO shape: **`KanbanBoardChangeDto`** (`actorId`, `reason`, optional `taskId` / `status`, `timestamp`).

Movement DTO: **`TaskMovedSocketDto`**.

---

## Frontend cache strategy

- **`board:changed`** and **`task:moved`**: schedule a **single debounced invalidation** (400 ms): `invalidateQueries({ queryKey: ["tasks"], exact: false })` and `["task"]` similarly.
- **Per-user events** (`task:created`, `task:updated`, `task:deleted`, `task:assigned`, `comment:new`): **same scheduled invalidation** so the board catches updates even when the client is not a named “recipient”.
- Existing **`comment:new`** still invalidates **`taskHistory`**.

---

## Duplicate updates / toast spam avoidance

- **Toasts**: If `payload.actorId` equals the parsed id from **`localStorage` `user`**, the client **skips** the toast (the mutator already shows success where applicable).
- **Refetch storm**: Debounced invalidation batches rapid `board:changed` + `task:moved` + per-user events.

---

## Manual test checklist

1. Open `http://localhost:3000` in two browsers (two users logged in).
2. **Create** a task in A → B’s board updates without refresh (if B’s API list includes that task per **creator/assignee** rules).
3. **Move** a task in A → B updates column without refresh.
4. **Edit** title/priority/deadline in A → B sees changes after refetch.
5. **Delete** in A → B sees card disappear when the task was in B’s list.
6. **Comment** in A → B gets notification path + history/comment refresh behavior.
7. Confirm **no double toast** for the user who performed the action (only success from mutation where present).

---

## Remaining limitations

- **Task list scope**: `GET /tasks` only returns tasks where the user is **creator** or **assignee**. Real-time refetch cannot show another user’s private tasks on B’s board until B is added as assignee or creates shared visibility.
- **Deploy**: Local and production must share the same **RabbitMQ** for cross-instance fan-out, or use a managed broker; otherwise only users on the same notifications instance receive events.
- **Ordering**: Debounce means sub-400 ms bursts collapse to one refetch (acceptable for hackathon demo).


---

## Source: `REALTIME_FIX_FINAL_REPORT.md`

# Real-time Kanban visibility — fix report

## Root cause

1. **API filtering:** `tasks-service.getAll` only returned rows where `creatorId === userId` OR `assignees` contained the user. After a websocket-driven refetch, **User B never received User A’s tasks** from `GET /api/tasks`.
2. **Cache refresh robustness:** Board sync already ran `invalidateQueries` on `["tasks"]`, which usually matches `[ "tasks", filters ]`; this was tightened to a **predicate** plus **active refetch** so every task-related observer updates reliably within the debounced window (~200 ms).

`board:changed` was already emitted globally (`server.emit`). The main functional gap was the **narrow list API**, not Socket.IO absence.

---

## Changed files

| Area | Path |
|------|------|
| Shared pagination DTO | `packages/types/dto/pagination/pagination-query.dto.ts` |
| Tasks list backend | `apps/tasks-service/src/task/task.service.ts` |
| Queries / mutations | `apps/web/src/hooks/useTasks.ts` |
| WebSocket sync | `apps/web/src/hooks/useWebSocket.ts` |
| Kanban caller | `apps/web/src/pages/KanbanPage.tsx` |

---

## Backend: shared board listing

- **Query:** `GET /api/tasks?sharedBoard=true&page=&limit=` (validated via `PaginationQueryDto.sharedBoard`).
- **Behavior:** When `sharedBoard === true`, the list returns **all** tasks (pagination unchanged). When omitted/false, the previous creator/assignee filter remains.

The Kanban page passes `sharedBoard: true` through `tasksService.getTasks` query params.

---

## Frontend: query invalidation

- **Debounced (~200 ms)** handler runs on: `board:changed`, `task:moved`, `task:created`, `task:updated`, `task:deleted`, `task:assigned`, `comment:new`.
- **Steps:** `invalidateQueries({ predicate })` where the first segment of `queryKey` is **`tasks`** (`TASKS_QUERY_ROOT`) or **`task`**, then **`refetchQueries({ type: "active", same predicate })`**.
- **Central key:** exported `TASKS_QUERY_ROOT = "tasks"` in `useTasks.ts`.

---

## Event names used (unchanged)

| Layer | Names |
|--------|--------|
| RabbitMQ → notifications | `task.created`, `task.updated`, `task.deleted`, `task.assigned`, `task.comment` |
| Socket.IO — global board | `board:changed`, `task:moved` |
| Socket.IO — per-room toasts | `task:created`, `task:updated`, `task:deleted`, `task:assigned`, `comment:new` |

---

## Manual test expectation

With `npm run dev:railway-db`, two browsers, two users:

1. A creates → B sees card without reload (`sharedBoard` + websocket refetch).
2. A moves → B column updates (`board:changed` / invalidate).
3. A edits → B updates after refetch.
4. A deletes → B card disappears (`GET` no longer returns it).

---

## Remaining limitations

- **`GET /api/tasks`** without `sharedBoard` retains the legacy restricted list (backward compatible).
- **`GET /api/tasks/:id`** is still unscoped; unrelated pages are unchanged.
- **Authorization:** Hackathon/demo choice: listing is auth-only; any logged-in user can see all tasks when `sharedBoard=true`.


---

## Source: `RUNTIME_CONNECTION_DEBUG_REPORT.md`

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


---

## Source: `SINGLE_SHARED_DATABASE_STATUS.md`

# Single shared database — status report

## 1. Railway CLI

- **Installed:** yes (`railway` on PATH).
- **Logged in:** yes (session present).
- **Linked project:** yes (`heroic-abundance`, environment `production`).

## 2. Automatic variable detection

- **Yes**, Postgres variables were fetched via `railway variable list -s Postgres -e production --json`.
- **`.env.railway.local`** was generated with `npm run sync:railway-env` (uses `DATABASE_PUBLIC_URL`, sets `DB_SSL=true`, copies `JWT_SECRET` from `@challenge/api-gateway` when available). Contents are not committed and are not summarized here.

If CLI is unavailable, use **RAILWAY_MANUAL_VALUES_NEEDED.md**.

## 3. `.env.railway.local` created

- **Yes** (gitignored).

## 4. Source code changes

- **Yes:** optional **SSL** for TypeORM when `DB_SSL=true` in `apps/*/db/datasource.ts`.
- **RabbitMQ:** tasks/notifications already use `RABBITMQ_URI` with fallback `amqp://admin:admin@rabbitmq:5672` and queue `notifications_queue`.

## 5. DB SSL support

- **Added:** `ssl: { rejectUnauthorized: false }` when `DB_SSL` is `true` or `1`; otherwise disabled for local Docker Postgres.

## 6. Local app with Railway DB

- **Works** after migration metadata was aligned for an existing Railway database (tables present but `migrations` table empty): **`npm run repair:railway-migrations`** one-time metadata inserts only (no DROP/TRUNCATE).

## 7. Test user in Railway DB

- **Yes** — created via `POST /api/auth/register` on local gateway; verified with a DB row count for `railway_local_test_%` users.

## 8. Test task in Railway DB

- **Yes** — created via `POST /api/tasks` with Bearer token; verified with a DB row count for titles matching `Railway verify %`.

## 9. DBeaver rule

Connect to **Railway Postgres** using the **public** host/port and credentials from the Railway Postgres service (SSL if required). Do **not** use `127.0.0.1:5433` to see this shared dataset (that is local Docker only).

Use the SQL samples in **ONE_MAIN_DATABASE_SETUP.md**.

## 10. Next action for you

1. Keep `.env.railway.local` out of git.
2. After pulling these changes, run `npm run sync:railway-env` (or fill env manually), then `npm run dev:railway-db`.
3. If auth/tasks/notifications fail on startup with **“relation already exists”** during migrations but tables already exist, run **`npm run repair:railway-migrations`** once (metadata only), then `npm run dev:railway-db` again.
4. On Railway, ensure **deployed** services use the same Postgres references and **`DB_SSL=true`** if required — see **RAILWAY_DEPLOY_VARIABLES_TO_SET.md**.

## Changed / added files (this work)

- `apps/auth-service/db/datasource.ts`
- `apps/tasks-service/db/datasource.ts`
- `apps/notifications-service/db/datasource.ts`
- `docker-compose.railway-db.yml` (`DB_SSL`, `depends_on` with `db: !reset null` for Railway mode)
- `.env.railway.example` (`DB_SSL`)
- `package.json` (`sync:railway-env`, `repair:railway-migrations`)
- `scripts/sync-railway-db-env.mjs`
- `scripts/repair-railway-migration-metadata.mjs`
- `RAILWAY_MANUAL_VALUES_NEEDED.md`
- `RAILWAY_DEPLOY_VARIABLES_TO_SET.md`
- `SINGLE_SHARED_DATABASE_STATUS.md` (this file)


---

## Source: `apps/api-gateway/README.md`

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).


---

## Source: `apps/auth-service/README.md`

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).


---

## Source: `apps/notifications-service/README.md`

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).


---

## Source: `apps/tasks-service/README.md`

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).


---

## Source: `apps/web/README.md`

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
