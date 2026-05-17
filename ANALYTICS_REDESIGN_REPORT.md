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
