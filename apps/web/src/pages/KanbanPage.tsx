import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { DailyPlanPanel } from "@/components/dashboard/DailyPlanPanel";
import { DashboardToolbar } from "@/components/dashboard/DashboardToolbar";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { TASKS_QUERY_ROOT, useTasks } from "@/hooks/useTasks";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { useTranslation } from "@/i18n/useTranslation";
import {
  applyClientTaskFilters,
  sortBoardTasks,
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
import { displayUsername, userInitials } from "@/lib/userDisplay";
import { listAdminUsers, type AdminListedUser } from "@/services/admin.service";
import type { ResponseTaskDto, ResponseUserDto, TaskPriority, TaskStatus } from "@challenge/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay, startOfMonth } from "date-fns";
import { RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export function KanbanPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deadlinePreset, setDeadlinePreset] =
    useState<QuickTaskFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: tasksData, isLoading, isFetching } = useTasks({
    page: 1,
    limit: 100,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });

  const fetchedTasks = tasksData?.items ?? [];

  const scopeTasks = useMemo(() => {
    if (!user?.id) return fetchedTasks;
    if (!seesOnlyAssignedTasks(user.role)) return fetchedTasks;
    return fetchedTasks.filter((x) =>
      (x.assignees ?? []).includes(user.id),
    );
  }, [fetchedTasks, user?.id, user?.role]);

  const { data: adminDirectory } = useQuery<

    AdminListedUser[]
  >({
    queryKey: ["adminUsers"],
    queryFn: listAdminUsers,
    enabled: isAdminRole(user?.role),
    staleTime: 60_000,
  });

  const teamIds = useMemo(
    () => uniqueUserIdsFromTasks(scopeTasks),
    [scopeTasks],
  );
  const { data: teamUsers = [] } = useUsersByIds(
    teamIds.length ? teamIds : undefined,
  );

  const assigneeOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of teamUsers) {
      m.set(u.id, displayUsername(u));
    }
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
    () =>
      Object.fromEntries(teamUsers.map((u) => [u.id, u])) as Record<
        string,
        ResponseUserDto
      >,
    [teamUsers],
  );

  const resolveInitials = useCallback(
    (id: string) => {
      const u = userById[id];
      if (u) return userInitials(u);
      return id.slice(0, 2).toUpperCase();
    },
    [userById],
  );

  const applySelectedDay = useCallback((d: Date) => {
    const sd = startOfDay(d);
    setSelectedDay(sd);
    setVisibleMonth(startOfMonth(sd));
  }, []);

  const clientFilters = useMemo(
    () => ({
      viewerId: user?.id,
      quickFilter: deadlinePreset,
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
      deadlinePreset,
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
    () => applyClientTaskFilters(scopeTasks, clientFilters),
    [scopeTasks, clientFilters],
  );

  const boardTasks = useMemo(
    () => sortBoardTasks(filteredTasks, sortMode),
    [filteredTasks, sortMode],
  );

  const filtersDirty = useMemo(
    () =>
      deadlinePreset !== "all" ||
      searchQuery.trim().length > 0 ||
      selectedStatuses.length > 0 ||
      selectedPriorities.length > 0 ||
      assigneeId != null ||
      deadlineFrom.length > 0 ||
      deadlineTo.length > 0 ||
      selectedDay != null,
    [
      deadlinePreset,
      searchQuery,
      selectedStatuses.length,
      selectedPriorities.length,
      assigneeId,
      deadlineFrom,
      deadlineTo,
      selectedDay,
    ],
  );

  const handleClearFilters = () => {
    setDeadlinePreset("all");
    setSearchQuery("");
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setAssigneeId(null);
    setDeadlineFrom("");
    setDeadlineTo("");
    setSelectedDay(null);
  };

  const handleTaskClick = (task: ResponseTaskDto) => {
    setSelectedTaskId(task.id);
  };

  const handleManualRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_ROOT] });
  };

  const showNewTask = (user?.role ?? "USER") !== "USER";

  const managerRole = canManageAssignments(user?.role);

  const body = (
    <div className="mx-auto max-w-[1700px] space-y-4 p-4 pb-10 lg:space-y-5 lg:p-6">
      {filtersDirty ? (
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
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
          <p className="max-w-xl text-right text-xs text-muted-foreground">
            {t("dashboard.filtersActiveHint")}
          </p>
        </div>
      ) : null}
      <DashboardToolbar
        hideToolbarSearch
        onManualRefresh={handleManualRefresh}
        isRefreshing={isFetching || isLoading}
        showNewTask={showNewTask}
        onNewTask={() => setCreateDialogOpen(true)}
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
        deadlinePreset={deadlinePreset}
        onDeadlinePreset={setDeadlinePreset}
        showAssigneeFilter={managerRole}
        showAssignedToMePreset={managerRole}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-stretch xl:min-h-[calc(100vh-11rem)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <div
            id="dashboard-board"
            className="flex min-h-0 flex-1 flex-col xl:min-h-[min(52vh,560px)]"
          >
            <KanbanBoard
              className="min-h-0 flex-1"
              tasks={boardTasks}
              isLoading={isLoading}
              onTaskClick={handleTaskClick}
              viewerId={user?.id}
              viewerRole={user?.role}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 xl:self-stretch">
          <div className="flex flex-col gap-4 xl:sticky xl:top-4">
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
              resolveInitials={resolveInitials}
            />
          </div>
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

  return (
    <AuthenticatedShell
      headerTitleKey="dashboard.kanbanPageTitle"
      globalSearchPlaceholderKey="dashboard.globalSearchPlaceholder"
      globalSearchValue={searchQuery}
      onGlobalSearchChange={setSearchQuery}
    >
      {body}
    </AuthenticatedShell>
  );
}
