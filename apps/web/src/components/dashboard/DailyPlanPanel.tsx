import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/i18n/useTranslation";
import {
  deadlineYmd,
  isTaskOverdue,
  tasksForDay,
  toLocalYmd,
  upcomingTasks,
} from "@/lib/dashboardDerived";
import { cn } from "@/lib/utils";
import type { ResponseTaskDto, TaskPriority } from "@challenge/types";
import { format, startOfDay } from "date-fns";
import { useMemo } from "react";

const PRIORITY_DOT: Record<TaskPriority, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-rose-600",
};

interface DailyPlanPanelProps {
  selectedDay: Date | null;
  allTasks: ResponseTaskDto[];
  onTaskClick: (task: ResponseTaskDto) => void;
  onOpenCalendar: () => void;
  resolveInitials: (userId: string) => string;
}

function sortByDeadline(a: ResponseTaskDto, b: ResponseTaskDto) {
  const at = a.deadline
    ? new Date(a.deadline as unknown as string).getTime()
    : Number.POSITIVE_INFINITY;
  const bt = b.deadline
    ? new Date(b.deadline as unknown as string).getTime()
    : Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;
  return a.title.localeCompare(b.title);
}

export function DailyPlanPanel({
  selectedDay,
  allTasks,
  onTaskClick,
  onOpenCalendar,
  resolveInitials,
}: DailyPlanPanelProps) {
  const { t, dateFnsLocale } = useTranslation();

  const overdueList = useMemo(() => {
    const base = allTasks
      .filter((task) => isTaskOverdue(task))
      .sort(sortByDeadline);
    if (!selectedDay) return base;
    const ymd = toLocalYmd(startOfDay(selectedDay));
    return base.filter((task) => deadlineYmd(task) !== ymd);
  }, [allTasks, selectedDay]);

  const dayTasks = useMemo(
    () =>
      selectedDay
        ? tasksForDay(allTasks, selectedDay).sort(sortByDeadline)
        : [],
    [allTasks, selectedDay],
  );

  const upcoming = useMemo(
    () =>
      !selectedDay ? upcomingTasks(allTasks, new Date(), 7) : [],
    [allTasks, selectedDay],
  );

  const mainList = selectedDay ? dayTasks : upcoming;
  const title = selectedDay
    ? `${t("dashboard.planForDay")} · ${format(selectedDay, "EEE, d MMM", { locale: dateFnsLocale })}`
    : t("dashboard.upcomingTasks");

  const renderRow = (task: ResponseTaskDto, overdue: boolean) => {
    const ids = task.assignees || [];
    const initials =
      ids[0] != null ? resolveInitials(ids[0]) : t("dashboard.noAssigneeShort");
    const timeLabel = task.deadline
      ? format(new Date(task.deadline as unknown as string), "HH:mm", {
          locale: dateFnsLocale,
        })
      : t("dashboard.noDeadlineShort");
    return (
      <button
        key={`${overdue ? "o" : "n"}-${task.id}`}
        type="button"
        onClick={() => onTaskClick(task)}
        className={cn(
          "flex w-full items-start gap-2 rounded-lg border px-2 py-2 text-left text-sm transition-colors hover:bg-muted/40",
          overdue
            ? "border-destructive/40 bg-destructive/5 hover:border-destructive/50"
            : "border-transparent hover:border-border",
        )}
      >
        <span
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
            PRIORITY_DOT[task.priority],
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{task.title}</p>
            {overdue ? (
              <span className="shrink-0 rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0 text-[10px] font-medium text-destructive">
                {t("dashboard.overdue")}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {timeLabel} · {initials}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-xl border bg-card shadow-md">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        {selectedDay ? (
          <p className="text-xs text-muted-foreground">
            {t("dashboard.selectedDay")}
          </p>
        ) : null}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {overdueList.length > 0 ? (
            <div className="space-y-1">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-destructive">
                {t("dashboard.overdueSection")}
              </p>
              <div className="space-y-1">
                {overdueList.slice(0, 6).map((task) => renderRow(task, true))}
              </div>
            </div>
          ) : null}
          <div className="space-y-1">
            {mainList.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                {selectedDay
                  ? t("dashboard.noTasksForDay")
                  : t("dashboard.noUpcoming")}
              </p>
            ) : (
              mainList.map((task) => renderRow(task, isTaskOverdue(task)))
            )}
          </div>
        </div>
      </ScrollArea>
      <div className="border-t p-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full shadow-sm"
          size="sm"
          onClick={onOpenCalendar}
        >
          {t("dashboard.openCalendar")}
        </Button>
      </div>
    </div>
  );
}
