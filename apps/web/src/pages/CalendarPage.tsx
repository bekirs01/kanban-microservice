import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { useTranslation } from "@/i18n/useTranslation";
import {
  applyClientTaskFilters,
  deadlineYmd,
  isTaskOverdue,
  sortBoardTasks,
  tasksForDay,
  uniqueUserIdsFromTasks,
  type QuickTaskFilter,
  type TaskSortMode,
} from "@/lib/dashboardDerived";
import {
  canManageAssignments,
  isAdminRole,
  seesOnlyAssignedTasks,
  sharedBoardQueryFlag,
} from "@/lib/rbac";
import { displayUsername } from "@/lib/userDisplay";
import { listAdminUsers, type AdminListedUser } from "@/services/admin.service";
import {
  TaskPriority,
  TaskStatus,
} from "@challenge/types/enums";
import type { ResponseTaskDto } from "@challenge/types";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type CalView = "month" | "week" | "agenda";

const STATUSES: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
];
const PRIOS: TaskPriority[] = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
];

function priorityClass(p: ResponseTaskDto["priority"]) {
  const map: Record<string, string> = {
    HIGH: "border-l-red-500",
    URGENT: "border-l-red-600",
    MEDIUM: "border-l-orange-400",
    LOW: "border-l-blue-400",
    DONE: "border-l-emerald-500",
  };
  return map[p] ?? "border-l-muted";
}

export function CalendarPage() {
  const { t, dateFnsLocale } = useTranslation();
  const { user } = useAuth();
  const [view, setView] = useState<CalView>("month");
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(startOfDay(new Date()));

  const [createOpen, setCreateOpen] = useState(false);
  const [presetDeadlineIso, setPresetDeadlineIso] = useState<string | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickTaskFilter>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>([]);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortMode] = useState<TaskSortMode>("deadline");

  const { data: tasksData } = useTasks({
    page: 1,
    limit: 200,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });
  const raw = tasksData?.items ?? [];

  const scopeTasks = useMemo(() => {
    if (!user?.id) return raw;
    if (!seesOnlyAssignedTasks(user.role)) return raw;
    return raw.filter((x) => (x.assignees ?? []).includes(user.id));
  }, [raw, user?.id, user?.role]);

  const baseFilters = useMemo(
    () => ({
      viewerId: user?.id,
      quickFilter,
      searchQuery,
      statuses: selectedStatuses.length ? selectedStatuses : null,
      priorities: selectedPriorities.length ? selectedPriorities : null,
      assigneeId,
      deadlineFrom,
      deadlineTo,
      selectedDay: null,
    }),
    [
      user?.id,
      quickFilter,
      searchQuery,
      selectedStatuses,
      selectedPriorities,
      assigneeId,
      deadlineFrom,
      deadlineTo,
    ],
  );

  const filteredTasks = useMemo(() => {
    let list = applyClientTaskFilters(scopeTasks, baseFilters as any);
    if (overdueOnly) {
      list = list.filter((t) => isTaskOverdue(t));
    }
    return sortBoardTasks(list, sortMode);
  }, [scopeTasks, baseFilters, overdueOnly, sortMode]);

  const gridTasks = filteredTasks;

  const { data: adminDirectory } = useQuery<AdminListedUser[]>({
    queryKey: ["adminUsers"],
    queryFn: listAdminUsers,
    enabled: isAdminRole(user?.role),
    staleTime: 60_000,
  });

  const teamIds = useMemo(() => uniqueUserIdsFromTasks(scopeTasks), [scopeTasks]);
  const { data: teamUsers = [] } = useUsersByIds(teamIds.length ? teamIds : undefined);

  const assigneeOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of teamUsers) {
      m.set(u.id, displayUsername(u));
    }
    if (isAdminRole(user?.role) && adminDirectory?.length) {
      for (const x of adminDirectory) {
        if (!m.has(x.id)) {
          m.set(x.id, x.username);
        }
      }
    }
    return [...m.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [teamUsers, adminDirectory, user?.role]);

  const elevated = canManageAssignments(user?.role);

  const calendarMonthLabel = format(anchor, "LLLL yyyy", { locale: dateFnsLocale });

  const visibleRangeStart =
    view === "month"
      ? startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
      : startOfWeek(anchor, { weekStartsOn: 1 });

  const visibleRangeEnd =
    view === "month"
      ? endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
      : endOfWeek(anchor, { weekStartsOn: 1 });

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: visibleRangeStart,
        end: visibleRangeEnd,
      }),
    [visibleRangeEnd, visibleRangeStart],
  );

  const backlogTasks = useMemo(
    () => gridTasks.filter((x) => !deadlineYmd(x)),
    [gridTasks],
  );

  const agendaBuckets = useMemo(() => {
    const now = startOfDay(new Date());
    const tomorrow = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const ov: ResponseTaskDto[] = [];
    const td: ResponseTaskDto[] = [];
    const tm: ResponseTaskDto[] = [];
    const wk: ResponseTaskDto[] = [];
    const lt: ResponseTaskDto[] = [];
    const nd: ResponseTaskDto[] = [];
    for (const task of filteredTasks) {
      if (!task.deadline) {
        nd.push(task);
        continue;
      }
      const ts = startOfDay(new Date(task.deadline as unknown as string));
      if (task.status !== "DONE" && isBefore(ts, now)) {
        ov.push(task);
      } else if (isSameDay(ts, now)) {
        td.push(task);
      } else if (isSameDay(ts, tomorrow)) {
        tm.push(task);
      } else if (ts <= weekEnd || isSameDay(ts, weekEnd)) {
        wk.push(task);
      } else {
        lt.push(task);
      }
    }
    return [
      { key: "calendar.agendaBucketOverdue" as const, items: ov },
      { key: "calendar.agendaBucketToday" as const, items: td },
      { key: "calendar.agendaBucketTomorrow" as const, items: tm },
      { key: "calendar.agendaBucketThisWeek" as const, items: wk },
      { key: "calendar.agendaBucketLater" as const, items: lt },
      { key: "calendar.agendaBucketNone" as const, items: nd },
    ];
  }, [filteredTasks]);

  const openCreateForDay = (d: Date | null) => {
    const day = d ? startOfDay(d) : startOfDay(new Date());
    setPresetDeadlineIso(day.toISOString());
    setCreateOpen(true);
  };

  return (
    <AuthenticatedShell headerTitleKey="calendar.pageTitle" globalSearchValue={searchQuery} onGlobalSearchChange={setSearchQuery} globalSearchPlaceholderKey="calendar.searchPlaceholder">
      <div className="mx-auto max-w-[1700px] space-y-4 p-4 pb-14 lg:p-6">
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {elevated ? (
              <>
                <Button type="button" size="sm" onClick={() => openCreateForDay(selectedDay)}>
                  + {t("calendar.toolbarNewTask")}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" size="sm" variant="outline" disabled title={t("common.forbidden")}>
                  + {t("calendar.toolbarNewTask")}
                </Button>
              </>
            )}
            <Button type="button" variant="outline" size="sm" disabled title={t("calendar.filterAllProjects")}>
              {t("calendar.filterAllProjects")}
            </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="inline-flex rounded-md border bg-muted/40 p-0.5">

                <Button
                  type="button"
                  size="sm"
                  variant={view === "month" ? "default" : "ghost"}
                  className="h-8"
                  onClick={() => setView("month")}
                >
                  {t("calendar.viewMonth")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={view === "week" ? "default" : "ghost"}
                  className="h-8"
                  onClick={() => setView("week")}
                >
                  {t("calendar.viewWeek")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={view === "agenda" ? "default" : "ghost"}
                  className="h-8"
                  onClick={() => setView("agenda")}
                >
                  {t("calendar.viewAgenda")}
                </Button>
              </div>

              <Button type="button" variant="outline" size="sm" disabled title={t("calendar.settingsDisabled")}>
                ⚙
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <Button type="button" variant="outline" size="icon" onClick={() => setAnchor((d) => (view === "month" ? startOfMonth(addMonths(d, -1)) : addMonths(d, -1)))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => setAnchor((d) => (view === "month" ? startOfMonth(addMonths(d, 1)) : addMonths(d, 1)))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setAnchor(view === "month" ? startOfMonth(new Date()) : startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              {t("calendar.todayButton")}
            </Button>
            <span className="text-sm font-semibold">{calendarMonthLabel}</span>
            <span className="text-xs text-muted-foreground">{t("calendar.legendHigh")}: ●</span>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <div className="space-y-1">
                <Label className="text-xs">{t("calendar.filterStatus")}</Label>
                <Select
                  value={selectedStatuses.length === 1 ? selectedStatuses[0] : "mixed"}
                  onValueChange={(v) => setSelectedStatuses(v === "mixed" ? [] : ([v as TaskStatus] as TaskStatus[]))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">{t("dashboard.filterChipAll")}</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("calendar.filterPriority")}</Label>
                <Select
                  value={selectedPriorities.length === 1 ? selectedPriorities[0] : "mixed"}
                  onValueChange={(v) => setSelectedPriorities(v === "mixed" ? [] : ([v as TaskPriority] as TaskPriority[]))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">{t("dashboard.filterChipAll")}</SelectItem>
                    {PRIOS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("calendar.filterAssignee")}</Label>
                <Select value={assigneeId ?? "all"} onValueChange={(v) => setAssigneeId(v === "all" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("dashboard.anyAssignee")}</SelectItem>
                    {assigneeOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("filters.headline")}</Label>
                <Button type="button" variant={overdueOnly ? "default" : "outline"} size="sm" className="w-full justify-center" onClick={() => setOverdueOnly((o) => !o)}>
                  {t("dashboard.filterChipOverdue")}
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("calendar.filterMyTasks")}</Label>
                <Button
                  type="button"
                  variant={quickFilter === "my" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => setQuickFilter((q) => (q === "my" ? "all" : "my"))}
                >
                  {t("dashboard.filterChipMy")}
                </Button>
              </div>
            </div>
            <div className="mb-4 grid gap-6 sm:grid-cols-2">
              <div className="flex min-h-[4.25rem] flex-col gap-2">
                <Label className="text-xs leading-snug">{t("calendar.filterDeadlineFrom")}</Label>
                <Input
                  type="date"
                  value={deadlineFrom}
                  onChange={(e) => setDeadlineFrom(e.target.value)}
                  className="w-full shrink-0 font-mono text-sm"
                />
              </div>
              <div className="flex min-h-[4.25rem] flex-col gap-2">
                <Label className="text-xs leading-snug">{t("calendar.filterDeadlineTo")}</Label>
                <Input
                  type="date"
                  value={deadlineTo}
                  onChange={(e) => setDeadlineTo(e.target.value)}
                  className="w-full shrink-0 font-mono text-sm"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedStatuses([]);
                setSelectedPriorities([]);
                setAssigneeId(null);
                setDeadlineFrom("");
                setDeadlineTo("");
                setQuickFilter("all");
                setOverdueOnly(false);
                setSearchQuery("");
              }}
            >
              {t("calendar.filterReset")}
            </Button>

            {view !== "agenda" && (
              <div className="grid grid-cols-7 gap-px rounded-lg bg-border text-[11px] font-medium text-muted-foreground">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="bg-card px-1 py-2 text-center capitalize">
                    {format(new Date(2024, 0, i), "EEE")}
                  </div>
                ))}
              </div>
            )}

            {view === "agenda" ? (
              <div className="space-y-6">
                {agendaBuckets.map((b) =>
                  b.items.length ? (
                    <div key={b.key}>
                      <p className="mb-2 text-sm font-semibold">{t(b.key)}</p>
                      <div className="space-y-2">
                        {b.items.map((task) => (
                          <button
                            key={`${b.key}-${task.id}`}
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                            className="flex w-full items-center gap-3 rounded-lg border bg-background px-3 py-2 text-left text-xs shadow-sm"
                          >
                            <span className={["w-1 self-stretch rounded-full", priorityClass(task.priority)].join(" ")} />
                            <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {task.deadline ? format(new Date(task.deadline as unknown as string), "dd MMM", { locale: dateFnsLocale }) : t("calendar.backlogTitle")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px rounded-lg bg-border">
                {calendarDays.slice(0, view === "week" ? 7 : calendarDays.length).map((day) => {
                  const inMonth = view === "month" ? isSameMonth(day, anchor) : true;
                  const sel = selectedDay ? isSameDay(day, selectedDay) : false;
                  const tasksDay = tasksForDay(gridTasks, day);
                  const shown = tasksDay.slice(0, 3);
                  const extra = tasksDay.length - shown.length;

                  return (
                    <button
                      type="button"
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(startOfDay(day))}
                      className={[
                        "flex min-h-[110px] flex-col gap-1 bg-card px-2 py-2 text-left outline-none hover:bg-muted/40",
                        inMonth ? "opacity-100" : "opacity-40",
                        sel ? "ring-1 ring-primary" : "",
                        isSameDay(day, startOfDay(new Date())) ? "relative" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={[
                            "inline-flex size-7 items-center justify-center rounded-full text-[12px]",
                            isSameDay(day, startOfDay(new Date())) ? "bg-primary text-primary-foreground" : "text-foreground",
                          ].join(" ")}
                        >
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                        {shown.map((task) => (
                          <button
                            key={`${task.id}-${day.toISOString()}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(task.id);
                            }}
                            className={[
                              "flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 text-left text-[10px]",
                              priorityClass(task.priority),
                              "border-l-4",
                            ].join(" ")}
                          >
                            <span className="truncate">{task.title}</span>
                          </button>
                        ))}
                        {extra > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(startOfDay(day));
                            }}
                            className="mx-auto rounded-md border px-2 py-0.5 text-[10px]"
                          >
                            {t("calendar.moreCount", { count: extra })}
                          </button>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {view === "month" && backlogTasks.length ? (
              <div className="mt-4 rounded-lg border border-dashed bg-muted/20 p-3">
                <p className="text-xs font-semibold">{t("calendar.backlogTitle")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {backlogTasks.slice(0, 12).map((task) => (
                    <Button key={task.id} type="button" variant="secondary" size="sm" className="h-auto max-w-[200px]" onClick={() => setSelectedTaskId(task.id)}>
                      <span className="truncate text-xs">{task.title}</span>
                    </Button>
                  ))}
                  {backlogTasks.length > 12 ? (
                    <span className="self-center text-xs text-muted-foreground">+ {backlogTasks.length - 12}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
      </div>

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} initialDeadlineISO={presetDeadlineIso} />

      <TaskDetailDialog taskId={selectedTaskId} open={!!selectedTaskId} onOpenChange={(open) => !open && setSelectedTaskId(null)} />
    </AuthenticatedShell>
  );
}

