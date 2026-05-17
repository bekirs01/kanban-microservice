import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTasks, useUnarchiveTask } from "@/hooks/useTasks";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { useTranslation } from "@/i18n/useTranslation";
import {
  approximateStatusProgressPercent,
  toLocalYmd,
} from "@/lib/dashboardDerived";
import { isAdminRole, sharedBoardQueryFlag } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { ResponseTaskDto, TaskPriority, TaskStatus } from "@challenge/types";
import {
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  RotateCcw,
} from "lucide-react";
import { format, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ArchiveFilters {
  search: string;
  archivedFrom: string;
  archivedTo: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  assigneeId: string;
}

const DEFAULT_FILTERS: ArchiveFilters = {
  search: "",
  archivedFrom: "",
  archivedTo: "",
  statuses: [],
  priorities: [],
  assigneeId: "all",
};

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as TaskStatus[];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[];
const PAGE_SIZES = [10, 25, 50];

export function ArchivePage() {
  const { t, dateFnsLocale } = useTranslation();
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ArchiveFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: tasksData, isLoading } = useTasks({
    page: 1,
    limit: 500,
    archived: true,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });

  const unarchiveTask = useUnarchiveTask();
  const isAdmin = isAdminRole(user?.role);

  const tasks = tasksData?.items ?? [];

  const allUserIds = useMemo(
    () =>
      Array.from(
        new Set(
          tasks
            .flatMap((task) => [
              task.creatorId,
              ...(task.assignees ?? []),
            ])
            .filter(Boolean),
        ),
      ),
    [tasks],
  );
  const { data: users = [] } = useUsersByIds(allUserIds.length ? allUserIds : undefined);

  const usersById = useMemo(
    () => new Map(users.map((item) => [item.id, item])),
    [users],
  );

  const assigneeOptions = useMemo(
    () =>
      Array.from(new Set(tasks.flatMap((task) => task.assignees ?? [])))
        .map((id) => ({
          id,
          label: usersById.get(id)?.username ?? t("common.unknownUser"),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [tasks, usersById, t],
  );

  useEffect(() => {
    setPage(1);
  }, [
    filters.search,
    filters.statuses,
    filters.priorities,
    filters.assigneeId,
    filters.archivedFrom,
    filters.archivedTo,
  ]);

  const applyArchiveFilters = (input: ResponseTaskDto[]) => {
    let output = [...input];
    const q = filters.search.trim().toLowerCase();
    if (q) {
      output = output.filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          (task.description ?? "").toLowerCase().includes(q),
      );
    }
    if (filters.statuses.length > 0) {
      output = output.filter((task) => filters.statuses.includes(task.status));
    }
    if (filters.priorities.length > 0) {
      output = output.filter((task) => filters.priorities.includes(task.priority));
    }
    if (filters.assigneeId !== "all") {
      output = output.filter((task) =>
        (task.assignees ?? []).includes(filters.assigneeId),
      );
    }
    if (filters.archivedFrom || filters.archivedTo) {
      output = output.filter((task) => {
        if (!task.archivedAt) return false;
        const archivedYmd = toLocalYmd(
          startOfDay(new Date(String(task.archivedAt))),
        );
        if (filters.archivedFrom && archivedYmd < filters.archivedFrom) {
          return false;
        }
        if (filters.archivedTo && archivedYmd > filters.archivedTo) {
          return false;
        }
        return true;
      });
    }
    return output.sort((a, b) => {
      const at = a.archivedAt ? new Date(String(a.archivedAt)).getTime() : 0;
      const bt = b.archivedAt ? new Date(String(b.archivedAt)).getTime() : 0;
      return bt - at;
    });
  };

  const filteredTasks = useMemo(
    () => applyArchiveFilters(tasks),
    [tasks, filters],
  );

  const filtersDirty = useMemo(
    () =>
      filters.search.trim().length > 0 ||
      filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.assigneeId !== "all" ||
      filters.archivedFrom.length > 0 ||
      filters.archivedTo.length > 0,
    [
      filters.search,
      filters.statuses.length,
      filters.priorities.length,
      filters.assigneeId,
      filters.archivedFrom,
      filters.archivedTo,
    ],
  );

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filteredTasks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filteredTasks.length);
  const pagedTasks = filteredTasks.slice(pageStart ? pageStart - 1 : 0, pageEnd);

  const selectedTasks = useMemo(
    () => tasks.filter((task) => selectedIds.includes(task.id)),
    [tasks, selectedIds],
  );

  const formatDate = (raw?: Date | string | null) => {
    if (!raw) return t("common.dash");
    const d = new Date(String(raw));
    if (Number.isNaN(d.getTime())) return t("common.dash");
    return format(d, "d MMM yyyy", { locale: dateFnsLocale });
  };

  const statusLabel = (status: TaskStatus) => {
    const map: Record<TaskStatus, string> = {
      TODO: t("board.columns.todo"),
      IN_PROGRESS: t("board.columns.inProgress"),
      REVIEW: t("board.columns.review"),
      DONE: t("board.columns.done"),
    };
    return map[status];
  };

  const priorityLabel = (priority: TaskPriority) =>
    t(`task.priority.${priority.toLowerCase() as "low" | "medium" | "high" | "urgent"}`);

  const assigneeLabel = (task: ResponseTaskDto) => {
    const first = task.assignees?.[0];
    if (!first) return t("dashboard.unassigned");
    const firstName = usersById.get(first)?.username ?? t("common.unknownUser");
    const extra = (task.assignees?.length ?? 0) - 1;
    return extra > 0
      ? t("archive.assigneeWithMore", { name: firstName, count: String(extra) })
      : firstName;
  };

  const initials = (label: string) =>
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedIds([]);
  };

  const toggleSelected = (taskId: string) => {
    setSelectedIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const togglePageSelection = () => {
    const pageIds = pagedTasks.map((task) => task.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...prev, ...pageIds])),
    );
  };

  const handleRestore = async (taskId: string) => {
    if (!isAdmin) return;
    try {
      await unarchiveTask.mutateAsync(taskId);
      toast.success(t("archive.restoredSuccessfully"));
      setSelectedIds((prev) => prev.filter((id) => id !== taskId));
      if (selectedTaskId === taskId) setSelectedTaskId(null);
    } catch {
      toast.error(t("archive.restoreFailed"));
    }
  };

  const handleBulkRestore = async () => {
    if (!isAdmin || selectedIds.length === 0) return;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await unarchiveTask.mutateAsync(id);
      } catch {
        failed += 1;
      }
    }
    if (failed > 0) {
      toast.error(t("archive.bulkRestorePartial", { count: String(failed) }));
    } else {
      toast.success(t("archive.restoredSuccessfully"));
    }
    setSelectedIds([]);
  };

  const exportSelected = () => {
    if (selectedTasks.length === 0) return;
    const payload = JSON.stringify(selectedTasks, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "archive-selection.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCountLabel = t("archive.selectedCount", {
    count: String(selectedIds.length),
  });

  const pageRangeLabel = t("archive.showingRange", {
    from: String(pageStart),
    to: String(pageEnd),
    total: String(filteredTasks.length),
  });

  const historyItems = filteredTasks
    .filter((task) => task.archivedAt)
    .slice(0, 8);

  const priorityBadgeClass = (priority: TaskPriority) =>
    cn(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
      priority === "URGENT" && "bg-red-100 text-red-700",
      priority === "HIGH" && "bg-orange-100 text-orange-700",
      priority === "MEDIUM" && "bg-amber-100 text-amber-700",
      priority === "LOW" && "bg-slate-100 text-slate-700",
    );

  const allPageSelected =
    pagedTasks.length > 0 && pagedTasks.every((task) => selectedIds.includes(task.id));

  const canUseArchiveActions = isAdmin && !unarchiveTask.isPending;

  const disabledActionReason = t("archive.workerActionDisabled");

  const updatePageSize = (next: string) => {
    setPageSize(Number(next));
    setPage(1);
  };

  return (
    <AuthenticatedShell
      headerTitleKey="archive.title"
      globalSearchPlaceholderKey="archive.searchPlaceholder"
      globalSearchValue={filters.search}
      onGlobalSearchChange={(next) =>
        setFilters((prev) => ({ ...prev, search: next }))
      }
      mainClassName="bg-slate-50/80"
    >
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-5 p-4 pb-12 lg:p-6">
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

        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-md lg:flex-row lg:flex-wrap lg:items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Filter className="mr-1.5 h-4 w-4" />
                {t("dashboard.filters")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("task.status")}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={
                          filters.statuses.includes(s) ? "default" : "outline"
                        }
                        className="h-8"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            statuses: prev.statuses.includes(s)
                              ? prev.statuses.filter((x) => x !== s)
                              : [...prev.statuses, s],
                          }))
                        }
                      >
                        {statusLabel(s)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("task.priorityField")}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITIES.map((p) => (
                      <Button
                        key={p}
                        type="button"
                        size="sm"
                        variant={
                          filters.priorities.includes(p) ? "default" : "outline"
                        }
                        className="h-8"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            priorities: prev.priorities.includes(p)
                              ? prev.priorities.filter((x) => x !== p)
                              : [...prev.priorities, p],
                          }))
                        }
                      >
                        {priorityLabel(p)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("archive.worker")}
                  </Label>
                  <Select
                    value={filters.assigneeId}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, assigneeId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("archive.anyWorker")}</SelectItem>
                      {assigneeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("archive.archiveDateRange")}</Label>
                    <Input
                      type="date"
                      value={filters.archivedFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          archivedFrom: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("archive.archiveDateTo")}</Label>
                    <Input
                      type="date"
                      value={filters.archivedTo}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          archivedTo: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("dashboard.clearFilters")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {selectedIds.length > 0 ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-primary/5 p-4 shadow-sm">
            <p className="text-sm font-medium">{selectedCountLabel}</p>
            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={!canUseArchiveActions}
                  onClick={() => handleBulkRestore()}
                >
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  {t("archive.restoreSelected")}
                </Button>
              ) : (
                <span className="rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {disabledActionReason}
                </span>
              )}
              <Button type="button" size="sm" variant="outline" onClick={exportSelected}>
                <Download className="mr-2 h-4 w-4" />
                {t("archive.exportSelected")}
              </Button>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4">
              <div>
                <h3 className="text-base font-semibold">{t("archive.task")}</h3>
                <p className="text-sm text-muted-foreground">{pageRangeLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">
                  {t("archive.pageSize")}
                </Label>
                <Select value={String(pageSize)} onValueChange={updatePageSize}>
                  <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={togglePageSelection}
                        aria-label={t("archive.selectPage")}
                        className="h-4 w-4 rounded border-muted-foreground/40"
                      />
                    </th>
                    <th className="px-4 py-3">{t("archive.task")}</th>
                    <th className="px-4 py-3">{t("archive.assignee")}</th>
                    <th className="px-4 py-3">{t("archive.priority")}</th>
                    <th className="px-4 py-3">{t("archive.statusBeforeArchive")}</th>
                    <th className="px-4 py-3">{t("archive.archivedDate")}</th>
                    <th className="px-4 py-3">{t("archive.archivedBy")}</th>
                    <th className="px-4 py-3 text-right">{t("archive.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        {t("common.loadingShort")}
                      </td>
                    </tr>
                  ) : pagedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-14">
                        <div className="mx-auto max-w-md rounded-2xl border bg-muted/30 p-8 text-center">
                          <p className="text-lg font-semibold">{t("archive.noArchivedTasks")}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{t("archive.archiveEmptyState")}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedTasks.map((task) => {
                      const assignee = assigneeLabel(task);
                      const selected = selectedIds.includes(task.id);
                      const progress = approximateStatusProgressPercent(task.status);
                      return (
                        <tr
                          key={task.id}
                          className="transition-colors hover:bg-muted/40"
                        >
                          <td className="px-4 py-4 align-top">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelected(task.id)}
                              aria-label={t("archive.selectTask")}
                              className="h-4 w-4 rounded border-muted-foreground/40"
                            />
                          </td>
                          <td className="max-w-[360px] px-4 py-4 align-top">
                            <button
                              type="button"
                              onClick={() => setSelectedTaskId(task.id)}
                              className="block w-full text-left"
                            >
                              <span className="font-semibold text-foreground">
                                {task.title}
                              </span>
                              <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                                {task.description || t("task.noDescriptionFallback")}
                              </span>
                              <span className="mt-2 block text-xs text-muted-foreground">
                                {t("archive.progressLabel", {
                                  progress: String(progress),
                                })}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {initials(assignee)}
                              </span>
                              <span className="max-w-[160px] truncate">{assignee}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span className={priorityBadgeClass(task.priority)}>
                              {priorityLabel(task.priority)}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                              {statusLabel(task.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top text-muted-foreground">
                            {formatDate(task.archivedAt)}
                          </td>
                          <td className="px-4 py-4 align-top text-muted-foreground">
                            {t("common.dash")}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTaskId(task.id)}
                              >
                                <Eye className="mr-1.5 h-4 w-4" />
                                {t("archive.openTask")}
                              </Button>
                              {isAdmin ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!canUseArchiveActions}
                                  onClick={() => handleRestore(task.id)}
                                >
                                  {t("archive.restoreTask")}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4">
              <p className="text-sm text-muted-foreground">{pageRangeLabel}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold">{t("archive.actionHistory")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("archive.actionHistorySubtitle")}
              </p>
            </div>
            {historyItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                {t("archive.noArchiveHistory")}
              </div>
            ) : (
              <ol className="space-y-4">
                {historyItems.map((task) => (
                  <li key={task.id} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="rounded-xl border bg-background p-3">
                      <p className="text-sm font-semibold">{t("archive.historyArchived")}</p>
                      <p className="mt-1 text-sm text-foreground">{task.title}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(task.archivedAt)} · {t("archive.archivedBy")}{" "}
                        {t("common.dash")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </div>

      <TaskDetailDialog
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </AuthenticatedShell>
  );
}
