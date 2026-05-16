import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { DailyPlanPanel } from "@/components/dashboard/DailyPlanPanel";
import { DashboardActivityPanel } from "@/components/dashboard/DashboardActivityPanel";
import { DashboardBottomBar } from "@/components/dashboard/DashboardBottomBar";
import { DashboardFilterChips } from "@/components/dashboard/DashboardFilterChips";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import type { DashboardNavId } from "@/components/dashboard/DashboardSidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardParticipantsPanel } from "@/components/dashboard/DashboardParticipantsPanel";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardToolbar } from "@/components/dashboard/DashboardToolbar";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { WeekPlanner } from "@/components/dashboard/WeekPlanner";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTranslation } from "@/i18n/useTranslation";
import {
  applyClientTaskFilters,
  computeStats,
  getPlannerDays,
  plannerRangeLabel,
  sortBoardTasks,
  uniqueUserIdsFromTasks,
  type DashboardViewGranularity,
  type QuickTaskFilter,
  type TaskSortMode,
} from "@/lib/dashboardDerived";
import { isAdminRole, sharedBoardQueryFlag } from "@/lib/rbac";
import { listAdminUsers } from "@/services/admin.service";
import {
  addMonths,
  addWeeks,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ResponseTaskDto, TaskPriority, TaskStatus } from "@challenge/types";

export function KanbanPage() {
  const { t, dateFnsLocale } = useTranslation();
  const { isConnected } = useWebSocket();
  const { user, logout } = useAuth();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<"kanban" | "calendar">(
    "kanban",
  );
  const [activeNav, setActiveNav] = useState<DashboardNavId>("board");
  const [quickFilter, setQuickFilter] = useState<QuickTaskFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [plannerGranularity, setPlannerGranularity] =
    useState<DashboardViewGranularity>("week");
  const [plannerAnchor, setPlannerAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>(
    [],
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [sortMode, setSortMode] = useState<TaskSortMode>("deadline");

  const {
    data: tasksData,
    isLoading,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useTasks({
    page: 1,
    limit: 100,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });

  const tasks = tasksData?.items ?? [];

  const { data: adminDirectory } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: listAdminUsers,
    enabled: isAdminRole(user?.role),
    staleTime: 60_000,
  });

  const teamIds = useMemo(() => uniqueUserIdsFromTasks(tasks), [tasks]);
  const { data: teamUsers = [] } = useUsersByIds(
    teamIds.length ? teamIds : undefined,
  );

  const assigneeOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of teamUsers) m.set(u.id, u.username);
    if (isAdminRole(user?.role) && adminDirectory?.length) {
      for (const u of adminDirectory) {
        if (!m.has(u.id)) m.set(u.id, u.username);
      }
    }
    return [...m.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [teamUsers, adminDirectory, user?.role]);

  const userById = useMemo(
    () => Object.fromEntries(teamUsers.map((u) => [u.id, u])) as Record<
      string,
      { username: string }
    >,
    [teamUsers],
  );

  const resolveInitials = useCallback(
    (id: string) =>
      userById[id]?.username?.slice(0, 2).toUpperCase() ??
      id.slice(0, 2).toUpperCase(),
    [userById],
  );

  const applySelectedDay = useCallback(
    (d: Date) => {
      const sd = startOfDay(d);
      setSelectedDay(sd);
      setVisibleMonth(startOfMonth(sd));
      setPlannerAnchor(
        plannerGranularity === "week"
          ? startOfWeek(sd, { weekStartsOn: 1 })
          : startOfMonth(sd),
      );
    },
    [plannerGranularity],
  );

  const clientFilters = useMemo(
    () => ({
      viewerId: user?.id,
      quickFilter,
      searchQuery,
      statuses: selectedStatuses.length ? selectedStatuses : null,
      priorities: selectedPriorities.length ? selectedPriorities : null,
      assigneeId,
      deadlineFrom,
      deadlineTo,
      selectedDay,
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
      selectedDay,
    ],
  );

  const filteredTasks = useMemo(
    () => applyClientTaskFilters(tasks, clientFilters),
    [tasks, clientFilters],
  );

  const boardTasks = useMemo(
    () => sortBoardTasks(filteredTasks, sortMode),
    [filteredTasks, sortMode],
  );

  const stats = useMemo(
    () => computeStats(filteredTasks, user?.id),
    [filteredTasks, user?.id],
  );

  const filtersDirty = useMemo(
    () =>
      quickFilter !== "all" ||
      searchQuery.trim().length > 0 ||
      selectedStatuses.length > 0 ||
      selectedPriorities.length > 0 ||
      assigneeId != null ||
      deadlineFrom.length > 0 ||
      deadlineTo.length > 0 ||
      selectedDay != null,
    [
      quickFilter,
      searchQuery,
      selectedStatuses.length,
      selectedPriorities.length,
      assigneeId,
      deadlineFrom,
      deadlineTo,
      selectedDay,
    ],
  );

  const plannerDays = useMemo(
    () => getPlannerDays(plannerAnchor, plannerGranularity),
    [plannerAnchor, plannerGranularity],
  );

  const rangeLabel = useMemo(() => {
    const { start, end } = plannerRangeLabel(
      plannerAnchor,
      plannerGranularity,
    );
    return `${format(start, "d MMM", { locale: dateFnsLocale })} – ${format(end, "d MMM yyyy", { locale: dateFnsLocale })}`;
  }, [plannerAnchor, plannerGranularity, dateFnsLocale]);

  const handleLogout = async () => {
    await logout();
    toast.success(t("board.logoutToast"));
  };

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleQuickFilter = useCallback((v: QuickTaskFilter) => {
    setQuickFilter(v);
    setActiveNav((prev) => {
      if (v === "my") return "myTasks";
      if (prev === "myTasks") return "board";
      return prev;
    });
  }, []);

  const handleNav = (id: DashboardNavId) => {
    setActiveNav(id);
    if (id === "myTasks") setQuickFilter("my");
    if (id === "board") setQuickFilter("all");
    if (id === "participants") {
      scrollToId("dashboard-participants");
      return;
    }
    if (id === "board") {
      setLayoutMode("kanban");
      scrollToId("dashboard-board");
    } else if (id === "calendar") {
      setLayoutMode("calendar");
      scrollToId("dashboard-week-planner");
    }
  };

  const handlePlannerGranularity = (g: DashboardViewGranularity) => {
    setPlannerGranularity(g);
    setPlannerAnchor((a) =>
      g === "month" ? startOfMonth(a) : startOfWeek(a, { weekStartsOn: 1 }),
    );
  };

  const handlePrevPlanner = () => {
    setSelectedDay(null);
    setPlannerAnchor((a) =>
      plannerGranularity === "week"
        ? addWeeks(a, -1)
        : addMonths(startOfMonth(a), -1),
    );
  };

  const handleNextPlanner = () => {
    setSelectedDay(null);
    setPlannerAnchor((a) =>
      plannerGranularity === "week"
        ? addWeeks(a, 1)
        : addMonths(startOfMonth(a), 1),
    );
  };

  const handleTodayPlanner = () => {
    applySelectedDay(new Date());
  };

  const handleClearFilters = () => {
    setQuickFilter("all");
    setSearchQuery("");
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setAssigneeId(null);
    setDeadlineFrom("");
    setDeadlineTo("");
    setSelectedDay(null);
    setActiveNav("board");
  };

  const handleTaskClick = (task: ResponseTaskDto) => {
    setSelectedTaskId(task.id);
  };

  const showNewTask = (user?.role ?? "USER") !== "USER";

  const showAdminParticipants =
    isAdminRole(user?.role) && (adminDirectory?.length ?? 0) > 0;

  return (
    <div className="flex min-h-screen flex-col bg-muted/25">
      <div className="flex min-h-0 flex-1">
        <DashboardSidebar
          activeNav={activeNav}
          onNav={handleNav}
          teamUsers={teamUsers}
          showInvite={isAdminRole(user?.role)}
          showParticipantsNav={isAdminRole(user?.role)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader
            isConnected={isConnected}
            user={user}
            layoutMode={layoutMode}
            onLayoutMode={(m) => {
              setLayoutMode(m);
              if (m === "kanban") scrollToId("dashboard-board");
              else scrollToId("dashboard-week-planner");
            }}
            onLogout={handleLogout}
          />
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1700px] space-y-4 p-4 pb-24 lg:space-y-5 lg:p-6">
              <DashboardStats stats={stats} />
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <DashboardFilterChips
                  value={quickFilter}
                  onChange={handleQuickFilter}
                />
                {filtersDirty ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 shadow-sm"
                    onClick={handleClearFilters}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    {t("dashboard.clearFilters")}
                  </Button>
                ) : null}
              </div>
              {filtersDirty ? (
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.filtersActiveHint")}
                </p>
              ) : null}
              <DashboardToolbar
                showNewTask={showNewTask}
                onNewTask={() => setCreateDialogOpen(true)}
                plannerGranularity={plannerGranularity}
                onPlannerGranularity={handlePlannerGranularity}
                sortMode={sortMode}
                onSortMode={setSortMode}
                deadlineFrom={deadlineFrom}
                deadlineTo={deadlineTo}
                onDeadlineFrom={setDeadlineFrom}
                onDeadlineTo={setDeadlineTo}
                selectedStatuses={selectedStatuses}
                onToggleStatus={(s) =>
                  setSelectedStatuses((prev) =>
                    prev.includes(s)
                      ? prev.filter((x) => x !== s)
                      : [...prev, s],
                  )
                }
                selectedPriorities={selectedPriorities}
                onTogglePriority={(p) =>
                  setSelectedPriorities((prev) =>
                    prev.includes(p)
                      ? prev.filter((x) => x !== p)
                      : [...prev, p],
                  )
                }
                assigneeId={assigneeId}
                onAssigneeId={setAssigneeId}
                assigneeOptions={assigneeOptions}
                onClearFilters={handleClearFilters}
                searchQuery={searchQuery}
                onSearchQuery={setSearchQuery}
              />

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
                <div className="min-w-0 space-y-4">
                  <WeekPlanner
                    days={plannerDays}
                    selectedDay={selectedDay}
                    onSelectDay={(d) => {
                      if (!d) {
                        setSelectedDay(null);
                        return;
                      }
                      applySelectedDay(d);
                    }}
                    tasks={filteredTasks}
                    granularity={plannerGranularity}
                    onPrev={handlePrevPlanner}
                    onNext={handleNextPlanner}
                    onToday={handleTodayPlanner}
                    rangeLabel={rangeLabel}
                  />
                  {layoutMode === "kanban" ? (
                    <div id="dashboard-board" className="min-h-[400px]">
                      <KanbanBoard
                        tasks={boardTasks}
                        isLoading={isLoading}
                        onTaskClick={handleTaskClick}
                        viewerId={user?.id}
                        viewerRole={user?.role}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-md">
                      {t("dashboard.calendarLayoutHint")}
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
                  <MiniCalendar
                    visibleMonth={visibleMonth}
                    onMonthChange={(m) => setVisibleMonth(startOfMonth(m))}
                    selectedDay={selectedDay}
                    onSelectDay={(d) => applySelectedDay(d)}
                    tasks={filteredTasks}
                  />
                  <DailyPlanPanel
                    selectedDay={selectedDay}
                    allTasks={filteredTasks}
                    onTaskClick={handleTaskClick}
                    onOpenCalendar={() => {
                      setLayoutMode("calendar");
                      setActiveNav("calendar");
                      scrollToId("dashboard-week-planner");
                    }}
                    resolveInitials={resolveInitials}
                  />
                  {showAdminParticipants && adminDirectory ? (
                    <DashboardParticipantsPanel
                      users={adminDirectory}
                      tasks={tasks}
                    />
                  ) : null}
                  <DashboardActivityPanel />
                </div>
              </div>
            </div>
          </div>
          <DashboardBottomBar
            tasks={filteredTasks}
            viewerId={user?.id}
            dataUpdatedAt={dataUpdatedAt}
            onRefresh={() => void refetch()}
            isRefreshing={isFetching}
            quickFilter={quickFilter}
            onQuickFilter={handleQuickFilter}
          />
        </div>
      </div>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <TaskDetailDialog
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </div>
  );
}
