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
import { useTranslation } from "@/i18n/useTranslation";
import type {
  DashboardViewGranularity,
  TaskSortMode,
} from "@/lib/dashboardDerived";
import type { TaskPriority, TaskStatus } from "@challenge/types";
import { Filter, Plus, RotateCcw, Search } from "lucide-react";

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as TaskStatus[];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[];

export interface AssigneeOption {
  id: string;
  label: string;
}

interface DashboardToolbarProps {
  showNewTask: boolean;
  onNewTask: () => void;
  plannerGranularity: DashboardViewGranularity;
  onPlannerGranularity: (g: DashboardViewGranularity) => void;
  sortMode: TaskSortMode;
  onSortMode: (m: TaskSortMode) => void;
  deadlineFrom: string;
  deadlineTo: string;
  onDeadlineFrom: (v: string) => void;
  onDeadlineTo: (v: string) => void;
  selectedStatuses: TaskStatus[];
  onToggleStatus: (s: TaskStatus) => void;
  selectedPriorities: TaskPriority[];
  onTogglePriority: (p: TaskPriority) => void;
  assigneeId: string | null;
  onAssigneeId: (id: string | null) => void;
  assigneeOptions: AssigneeOption[];
  onClearFilters: () => void;
  searchQuery: string;
  onSearchQuery: (v: string) => void;
}

export function DashboardToolbar({
  showNewTask,
  onNewTask,
  plannerGranularity,
  onPlannerGranularity,
  sortMode,
  onSortMode,
  deadlineFrom,
  deadlineTo,
  onDeadlineFrom,
  onDeadlineTo,
  selectedStatuses,
  onToggleStatus,
  selectedPriorities,
  onTogglePriority,
  assigneeId,
  onAssigneeId,
  assigneeOptions,
  onClearFilters,
  searchQuery,
  onSearchQuery,
}: DashboardToolbarProps) {
  const { t } = useTranslation();

  const statusLabel = (s: TaskStatus) => {
    const map: Record<TaskStatus, string> = {
      TODO: t("board.columns.todo"),
      IN_PROGRESS: t("board.columns.inProgress"),
      REVIEW: t("board.columns.review"),
      DONE: t("board.columns.done"),
    };
    return map[s];
  };

  const priorityLabel = (p: TaskPriority) =>
    t(`task.priority.${p.toLowerCase() as "low" | "medium" | "high" | "urgent"}`);

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-md lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {showNewTask ? (
          <Button type="button" size="sm" className="shrink-0" onClick={onNewTask}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("board.addTask")}
          </Button>
        ) : null}

        <div className="relative min-w-[10rem] flex-1 sm:max-w-xs lg:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8 text-sm shadow-sm"
            value={searchQuery}
            onChange={(e) => onSearchQuery(e.target.value)}
            placeholder={t("dashboard.searchPlaceholder")}
            aria-label={t("dashboard.searchPlaceholder")}
          />
        </div>

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
                        selectedStatuses.includes(s) ? "default" : "outline"
                      }
                      className="h-8"
                      onClick={() => onToggleStatus(s)}
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
                        selectedPriorities.includes(p) ? "default" : "outline"
                      }
                      className="h-8"
                      onClick={() => onTogglePriority(p)}
                    >
                      {priorityLabel(p)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("task.assignee")}
                </Label>
                <Select
                  value={assigneeId ?? "all"}
                  onValueChange={(v) =>
                    onAssigneeId(v === "all" ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("participants.searchPlaceholder")} />
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("board.dateFilterFromAria")}</Label>
                  <Input
                    type="date"
                    value={deadlineFrom}
                    onChange={(e) => onDeadlineFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("board.dateFilterToAria")}</Label>
                  <Input
                    type="date"
                    value={deadlineTo}
                    onChange={(e) => onDeadlineTo(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={onClearFilters}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("dashboard.clearFilters")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {t("dashboard.quickActions")}
          </span>
          <Select
            value={plannerGranularity}
            onValueChange={(v) =>
              onPlannerGranularity(v as DashboardViewGranularity)
            }
          >
            <SelectTrigger className="h-9 w-[120px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("dashboard.week")}</SelectItem>
              <SelectItem value="month">{t("dashboard.month")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortMode} onValueChange={(v) => onSortMode(v as TaskSortMode)}>
            <SelectTrigger className="h-9 w-[140px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">{t("dashboard.sortDeadline")}</SelectItem>
              <SelectItem value="priority">{t("dashboard.sortPriority")}</SelectItem>
              <SelectItem value="created">{t("dashboard.sortCreated")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
