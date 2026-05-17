import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/useTranslation";
import {
  computeWorkerLoad,
  type AnalyticsUiFilters,
  type AnalyticsPeriod,
} from "@/lib/analyticsScope";
import {
  computeStats,
  countCreatedToday,
  deadlineYmd,
  isTaskOverdue,
} from "@/lib/dashboardDerived";
import {
  maxCount,
  priorityDistributionForAnalytics,
  statusDistributionForAnalytics,
  weeklyCreatedBuckets,
  type LabelCount,
} from "@/lib/dashboardAnalytics";
import { cn } from "@/lib/utils";
import type { ResponseTaskDto, TaskPriority, TaskStatus } from "@challenge/types";
import { TaskPriority as TaskPriorityEnum, TaskStatus as TaskStatusEnum } from "@challenge/types/enums";
import { addDays, format, isSameWeek, startOfDay } from "date-fns";
import {
  AlertCircle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock,
  Flame,
  ListTodo,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo } from "react";

const SEGMENT_COLORS = [
  "text-primary",
  "text-emerald-500",
  "text-amber-500",
  "text-violet-500",
  "text-sky-500",
  "text-rose-500",
];

const SEGMENT_FILL: Record<string, string> = {
  "text-primary": "bg-primary",
  "text-emerald-500": "bg-emerald-500",
  "text-amber-500": "bg-amber-500",
  "text-violet-500": "bg-violet-500",
  "text-sky-500": "bg-sky-500",
  "text-rose-500": "bg-rose-500",
};

function polar(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function donutWedgePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
  return `M ${cx} ${cy} L ${end.x} ${end.y} A ${r} ${r} 0 ${largeArc} 1 ${start.x} ${start.y} Z`;
}

function DistributionPanel({
  title,
  totalLabel,
  rows,
  emptyHint,
}: {
  title: string;
  totalLabel: string;
  rows: { label: string; count: number; colorClass: string }[];
  emptyHint: string;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const max = maxCount(rows);

  if (total === 0) {
    return (
      <div className="flex h-full min-h-[200px] flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  const cx = 80;
  const cy = 80;
  const r = 58;
  let angle = -Math.PI / 2;
  const segments = rows
    .filter((row) => row.count > 0)
    .map((row) => {
      const frac = row.count / total;
      const a0 = angle;
      const a1 = angle + frac * 2 * Math.PI;
      angle = a1;
      return {
        ...row,
        path: donutWedgePath(cx, cy, r, a0, a1),
      };
    });

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {totalLabel}: {total}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row lg:items-stretch">
        <div className="flex shrink-0 justify-center lg:w-[200px] lg:justify-start">
          <div className="relative h-[168px] w-[168px] shrink-0">
            <svg
              viewBox="0 0 160 160"
              className="h-full w-full text-primary drop-shadow-sm"
              aria-hidden
            >
              <circle cx={cx} cy={cy} r={r * 0.52} className="fill-muted/40" />
              {segments.map((s) => (
                <path key={s.label} d={s.path} className={cn("fill-current", s.colorClass)} />
              ))}
            </svg>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3 overflow-hidden">
          {rows.map((row) => {
            const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
            const fill = SEGMENT_FILL[row.colorClass] ?? "bg-primary";
            const w = max > 0 ? Math.round((row.count / max) * 100) : 0;
            return (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full bg-current", row.colorClass)}
                    />
                    <span className="truncate text-muted-foreground">{row.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-foreground">
                    {row.count}{" "}
                    <span className="font-normal text-muted-foreground">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80">
                  <div
                    className={cn("h-full rounded-full transition-all", fill)}
                    style={{ width: `${w}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrendAreaChart({ rows }: { rows: LabelCount[] }) {
  const w = 800;
  const h = 200;
  const padL = 28;
  const padR = 16;
  const padT = 18;
  const padB = 36;
  const chartH = h - padT - padB;
  const chartW = w - padL - padR;
  const n = rows.length;
  const max = Math.max(1, ...rows.map((r) => r.count));

  const points = useMemo(() => {
    if (!n) return [];
    return rows.map((r, i) => {
      const x =
        n <= 1 ? padL + chartW / 2 : padL + (i / (n - 1)) * chartW;
      const yRatio = r.count / max;
      const y = padT + chartH - yRatio * chartH;
      return { x, y, label: r.label, count: r.count };
    });
  }, [rows, n, chartW, chartH, padL, padT, max]);

  const lineD = useMemo(() => {
    if (!points.length) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }, [points]);

  const areaD = useMemo(() => {
    if (!points.length) return "";
    const baseY = padT + chartH;
    const first = points[0];
    const last = points[points.length - 1];
    return `${lineD} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
  }, [points, lineD, padT, chartH]);

  if (!n) return null;

  return (
    <div className="relative h-[200px] w-full min-w-0 max-w-full shrink-0">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-full w-full text-primary"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <linearGradient id="analyticsTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#analyticsTrendFill)" className="text-primary" />
        <path
          d={lineD}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle
            key={`${p.label}-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            className="fill-background stroke-current"
            strokeWidth={2}
          />
        ))}
        {points.map((p) => (
          <text
            key={`lbl-${p.label}`}
            x={p.x}
            y={h - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  iconWrapClass,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string | number;
  hint?: string;
  iconWrapClass: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-3.5">
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white",
            iconWrapClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight sm:text-xl">
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[11px]">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TaskStripRow({
  task,
  onOpen,
  statusLabel,
  priorityLabel,
  assigneeInitials,
  deadlineLabel,
  badgeClass,
}: {
  task: ResponseTaskDto;
  onOpen: (id: string) => void;
  statusLabel: string;
  priorityLabel: string;
  assigneeInitials: string;
  deadlineLabel: string;
  badgeClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left text-xs transition-colors hover:border-border hover:bg-muted/50",
        badgeClass,
      )}
    >
      <span className="h-8 w-8 shrink-0 rounded-full bg-muted text-center text-[10px] font-semibold leading-8 text-muted-foreground">
        {assigneeInitials || "—"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{task.title}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {deadlineLabel} · {priorityLabel} · {statusLabel}
        </p>
      </div>
    </button>
  );
}

export function AnalyticsDashboard({
  tasks,
  filters,
  onFiltersChange,
  isAdmin,
  viewerId,
  workerDirectory,
  statusLabel,
  priorityLabel,
  onTaskOpen,
}: {
  tasks: ResponseTaskDto[];
  filters: AnalyticsUiFilters;
  onFiltersChange: (next: AnalyticsUiFilters) => void;
  isAdmin: boolean;
  viewerId?: string;
  workerDirectory: { id: string; username: string; email: string }[];
  statusLabel: (s: TaskStatus) => string;
  priorityLabel: (p: TaskPriority) => string;
  onTaskOpen: (id: string) => void;
}) {
  const { t, dateFnsLocale } = useTranslation();

  const stats = useMemo(() => computeStats(tasks, viewerId), [tasks, viewerId]);
  const createdToday = useMemo(() => countCreatedToday(tasks), [tasks]);
  const completionRate =
    tasks.length === 0 ? 0 : Math.round((stats.done / tasks.length) * 100);

  const statusRows = useMemo(() => {
    const rows = statusDistributionForAnalytics(tasks, statusLabel);
    return rows.map((r, i) => ({
      ...r,
      colorClass: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    }));
  }, [tasks, statusLabel]);

  const priorityRows = useMemo(() => {
    const rows = priorityDistributionForAnalytics(tasks, priorityLabel);
    return rows.map((r, i) => ({
      ...r,
      colorClass: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    }));
  }, [tasks, priorityLabel]);

  const weekRows = useMemo(
    () =>
      weeklyCreatedBuckets(tasks, 1, 8, (s) =>
        format(s, "d MMM", { locale: dateFnsLocale }),
      ),
    [tasks, dateFnsLocale],
  );

  const activityItems = useMemo(() => {
    const sorted = [...tasks].sort(
      (a, b) =>
        new Date(b.createdAt as unknown as string).getTime() -
        new Date(a.createdAt as unknown as string).getTime(),
    );
    return sorted.slice(0, 8).map((task) => ({
      task,
      at: new Date(task.createdAt as unknown as string),
    }));
  }, [tasks]);

  const workerLoad = useMemo(
    () =>
      computeWorkerLoad(tasks, {
        viewerId,
        isAdmin,
      }),
    [tasks, viewerId, isAdmin],
  );

  const ref = new Date();
  const refStart = startOfDay(ref).getTime();
  const refWeekEnd = addDays(startOfDay(ref), 7).getTime();

  const overdueList = useMemo(
    () =>
      tasks
        .filter((x) => isTaskOverdue(x))
        .sort(
          (a, b) =>
            new Date(a.deadline as unknown as string).getTime() -
            new Date(b.deadline as unknown as string).getTime(),
        )
        .slice(0, 6),
    [tasks],
  );

  const upcomingList = useMemo(
    () =>
      tasks
        .filter((x) => {
          if (x.status === "DONE" || !x.deadline) return false;
          const ts = new Date(x.deadline as unknown as string).getTime();
          if (Number.isNaN(ts)) return false;
          return ts >= refStart && ts < refWeekEnd;
        })
        .sort(
          (a, b) =>
            new Date(a.deadline as unknown as string).getTime() -
            new Date(b.deadline as unknown as string).getTime(),
        )
        .slice(0, 6),
    [tasks, refStart, refWeekEnd],
  );

  const noDeadlineList = useMemo(
    () => tasks.filter((x) => !x.deadline).slice(0, 5),
    [tasks],
  );

  const thisWeekDeadlineList = useMemo(() => {
    return tasks
      .filter((x) => {
        if (!x.deadline) return false;
        const d = new Date(x.deadline as unknown as string);
        if (Number.isNaN(d.getTime())) return false;
        return isSameWeek(d, ref, { weekStartsOn: 1 });
      })
      .sort(
        (a, b) =>
          new Date(a.deadline as unknown as string).getTime() -
          new Date(b.deadline as unknown as string).getTime(),
      )
      .slice(0, 6);
  }, [tasks, ref]);

  const workerLabel = (uid: string) => {
    const row = workerDirectory.find((u) => u.id === uid);
    if (row) return row.username || row.email;
    return uid.slice(0, 8);
  };

  const assigneeInitialsFor = (task: ResponseTaskDto) => {
    const id = task.assignees?.[0];
    if (!id) return "";
    const row = workerDirectory.find((u) => u.id === id);
    const name = row?.username || row?.email || id;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 3);
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDeadline = (task: ResponseTaskDto) => {
    const y = deadlineYmd(task);
    if (!y) return t("analytics.noDeadline");
    return format(new Date(`${y}T12:00:00`), "d MMM yyyy", { locale: dateFnsLocale });
  };

  const maxLoad = workerLoad.length ? Math.max(...workerLoad.map((w) => w.assigned)) : 1;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 pb-16 pt-1 sm:px-4 lg:px-6">
      <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>

      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/60 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("analytics.period")}
            </span>
            <Select
              value={filters.period}
              onValueChange={(v) =>
                onFiltersChange({ ...filters, period: v as AnalyticsPeriod })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t("analytics.today")}</SelectItem>
                <SelectItem value="week">{t("analytics.week")}</SelectItem>
                <SelectItem value="month">{t("analytics.month")}</SelectItem>
                <SelectItem value="all">{t("analytics.allTime")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("analytics.status")}
            </span>
            <Select
              value={filters.status}
              onValueChange={(v) =>
                onFiltersChange({
                  ...filters,
                  status: v as TaskStatus | "all",
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("analytics.filterAnyStatus")}</SelectItem>
                <SelectItem value={TaskStatusEnum.TODO}>{statusLabel(TaskStatusEnum.TODO)}</SelectItem>
                <SelectItem value={TaskStatusEnum.IN_PROGRESS}>
                  {statusLabel(TaskStatusEnum.IN_PROGRESS)}
                </SelectItem>
                <SelectItem value={TaskStatusEnum.REVIEW}>{statusLabel(TaskStatusEnum.REVIEW)}</SelectItem>
                <SelectItem value={TaskStatusEnum.DONE}>{statusLabel(TaskStatusEnum.DONE)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("analytics.priority")}
            </span>
            <Select
              value={filters.priority}
              onValueChange={(v) =>
                onFiltersChange({
                  ...filters,
                  priority: v as TaskPriority | "all",
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("analytics.filterAnyPriority")}</SelectItem>
                <SelectItem value={TaskPriorityEnum.URGENT}>{priorityLabel(TaskPriorityEnum.URGENT)}</SelectItem>
                <SelectItem value={TaskPriorityEnum.HIGH}>{priorityLabel(TaskPriorityEnum.HIGH)}</SelectItem>
                <SelectItem value={TaskPriorityEnum.MEDIUM}>{priorityLabel(TaskPriorityEnum.MEDIUM)}</SelectItem>
                <SelectItem value={TaskPriorityEnum.LOW}>{priorityLabel(TaskPriorityEnum.LOW)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdmin ? (
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("analytics.worker")}
              </span>
              <Select
                value={filters.assigneeId}
                onValueChange={(v) =>
                  onFiltersChange({
                    ...filters,
                    assigneeId: v,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("analytics.filterAnyWorker")}</SelectItem>
                  {workerDirectory.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() =>
            onFiltersChange({
              period: "all",
              status: "all",
              priority: "all",
              assigneeId: "all",
            })
          }
        >
          {t("analytics.resetFilters")}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("analytics.filteredResults", { count: tasks.length })}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <KpiCard
          icon={ClipboardList}
          label={t("analytics.totalTasks")}
          value={stats.total}
          iconWrapClass="bg-primary"
        />
        <KpiCard
          icon={CalendarDays}
          label={t("analytics.createdToday")}
          value={createdToday}
          iconWrapClass="bg-sky-500"
        />
        <KpiCard
          icon={AlertCircle}
          label={t("analytics.overdue")}
          value={stats.overdue}
          iconWrapClass="bg-rose-500"
        />
        <KpiCard
          icon={CalendarRange}
          label={t("analytics.thisWeek")}
          value={stats.thisWeek}
          iconWrapClass="bg-amber-500"
        />
        <KpiCard
          icon={TrendingUp}
          label={t("analytics.inProgress")}
          value={stats.inProgress}
          iconWrapClass="bg-violet-500"
        />
        <KpiCard
          icon={CheckCircle2}
          label={t("analytics.done")}
          value={stats.done}
          hint={
            tasks.length > 0
              ? t("analytics.completionRate", { pct: completionRate })
              : undefined
          }
          iconWrapClass="bg-emerald-500"
        />
        <KpiCard
          icon={UserRound}
          label={t("analytics.assignedToMe")}
          value={stats.assignedToMe}
          iconWrapClass="bg-cyan-600"
        />
        <KpiCard
          icon={CircleDashed}
          label={t("analytics.unassigned")}
          value={stats.unassigned}
          iconWrapClass="bg-slate-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionPanel
          title={t("analytics.statusDistribution")}
          totalLabel={t("analytics.tasks")}
          rows={statusRows}
          emptyHint={t("analytics.noData")}
        />
        <DistributionPanel
          title={t("analytics.priorityDistribution")}
          totalLabel={t("analytics.tasks")}
          rows={priorityRows}
          emptyHint={t("analytics.noData")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
        <section className="flex min-h-0 flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">
              {t("analytics.createdTrend")}
            </h2>
            <span className="text-xs text-muted-foreground">{t("analytics.weeksWindow")}</span>
          </div>
          {weekRows.every((r) => r.count === 0) ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-3">
              <p className="text-center text-xs text-muted-foreground">{t("analytics.noData")}</p>
            </div>
          ) : (
            <TrendAreaChart rows={weekRows} />
          )}
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">{t("analytics.teamActivity")}</h2>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </div>
          {activityItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("analytics.noActivity")}</p>
          ) : (
            <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {activityItems.map(({ task, at }) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onTaskOpen(task.id)}
                    className="flex w-full gap-2 rounded-lg border border-transparent px-1 py-1.5 text-left text-xs transition-colors hover:border-border hover:bg-muted/40"
                  >
                    <span className="mt-0.5 text-muted-foreground">
                      <Flame className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{t("analytics.created")}</span>
                      <span className="mt-0.5 block truncate text-muted-foreground">
                        {task.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {format(at, "PPp", { locale: dateFnsLocale })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">{t("analytics.workerLoad")}</h2>
        </div>
        {workerLoad.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("analytics.noWorkload")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workerLoad.map((row) => {
              const pct = Math.round((row.assigned / maxLoad) * 100);
              return (
                <li
                  key={row.userId}
                  className="rounded-lg border border-border/70 bg-background/80 p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {workerLabel(row.userId)}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {row.assigned} {t("analytics.tasks")}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {t("analytics.workloadBreakdown", {
                      active: row.inProgress,
                      overdue: row.overdue,
                    })}
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">{t("analytics.deadlineControl")}</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("analytics.upcomingDeadlines")}
            </h3>
            {upcomingList.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("analytics.emptySection")}</p>
            ) : (
              <ul className="space-y-1">
                {upcomingList.map((task) => (
                  <li key={task.id}>
                    <TaskStripRow
                      task={task}
                      onOpen={onTaskOpen}
                      statusLabel={statusLabel(task.status)}
                      priorityLabel={priorityLabel(task.priority)}
                      assigneeInitials={assigneeInitialsFor(task)}
                      deadlineLabel={formatDeadline(task)}
                      badgeClass="border-l-2 border-l-sky-500/80"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("analytics.overdueTasks")}
            </h3>
            {overdueList.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("analytics.emptySection")}</p>
            ) : (
              <ul className="space-y-1">
                {overdueList.map((task) => (
                  <li key={task.id}>
                    <TaskStripRow
                      task={task}
                      onOpen={onTaskOpen}
                      statusLabel={statusLabel(task.status)}
                      priorityLabel={priorityLabel(task.priority)}
                      assigneeInitials={assigneeInitialsFor(task)}
                      deadlineLabel={formatDeadline(task)}
                      badgeClass="border-l-2 border-l-rose-500/80"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("analytics.deadlineSoon")}
            </h3>
            {thisWeekDeadlineList.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("analytics.emptySection")}</p>
            ) : (
              <ul className="space-y-1">
                {thisWeekDeadlineList.map((task) => (
                  <li key={task.id}>
                    <TaskStripRow
                      task={task}
                      onOpen={onTaskOpen}
                      statusLabel={statusLabel(task.status)}
                      priorityLabel={priorityLabel(task.priority)}
                      assigneeInitials={assigneeInitialsFor(task)}
                      deadlineLabel={formatDeadline(task)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("analytics.noDeadlineTasks")}
            </h3>
            {noDeadlineList.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("analytics.emptySection")}</p>
            ) : (
              <ul className="space-y-1">
                {noDeadlineList.map((task) => (
                  <li key={task.id}>
                    <TaskStripRow
                      task={task}
                      onOpen={onTaskOpen}
                      statusLabel={statusLabel(task.status)}
                      priorityLabel={priorityLabel(task.priority)}
                      assigneeInitials={assigneeInitialsFor(task)}
                      deadlineLabel={t("analytics.noDeadline")}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
