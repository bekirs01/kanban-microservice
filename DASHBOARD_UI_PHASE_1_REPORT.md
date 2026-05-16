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
