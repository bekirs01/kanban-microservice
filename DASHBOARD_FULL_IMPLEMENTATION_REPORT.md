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
