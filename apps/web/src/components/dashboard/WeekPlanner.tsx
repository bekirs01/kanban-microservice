import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import type { DashboardViewGranularity } from "@/lib/dashboardDerived";
import { countTasksDueOnDay } from "@/lib/dashboardDerived";
import { cn } from "@/lib/utils";
import type { ResponseTaskDto } from "@challenge/types";
import { format, isSameDay, isWeekend } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekPlannerProps {
  days: Date[];
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
  tasks: ResponseTaskDto[];
  granularity: DashboardViewGranularity;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  rangeLabel: string;
}

export function WeekPlanner({
  days,
  selectedDay,
  onSelectDay,
  tasks,
  granularity,
  onPrev,
  onNext,
  onToday,
  rangeLabel,
}: WeekPlannerProps) {
  const { t, dateFnsLocale } = useTranslation();

  return (
    <div
      id="dashboard-week-planner"
      className="rounded-xl border bg-card p-4 shadow-md"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {granularity === "week" ? t("dashboard.week") : t("dashboard.month")}
          </p>
          <p className="text-sm font-medium text-foreground">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onToday}>
            {t("dashboard.today")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label={t("dashboard.previousWeek")}
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label={t("dashboard.nextWeek")}
            onClick={onNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onSelectDay(null)}
          >
            {t("dashboard.allDays")}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
        {days.map((day) => {
          const count = countTasksDueOnDay(tasks, day);
          const selected = selectedDay && isSameDay(day, selectedDay);
          const weekend = isWeekend(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                if (selectedDay && isSameDay(day, selectedDay)) {
                  onSelectDay(null);
                } else {
                  onSelectDay(day);
                }
              }}
              className={cn(
                "flex min-w-[4.5rem] flex-col rounded-lg border px-2.5 py-2 text-left text-xs transition-all sm:min-w-[5.25rem]",
                selected
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20"
                  : "border-border/80 bg-muted/30 hover:border-primary/30 hover:bg-muted/50",
                weekend && !selected && "bg-amber-50/50 dark:bg-amber-950/20",
              )}
            >
              <span className="font-semibold text-[10px] uppercase text-muted-foreground">
                {format(day, "EEE", { locale: dateFnsLocale })}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {format(day, "d MMM", { locale: dateFnsLocale })}
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground">
                {t("dashboard.tasksDueCount", { count })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
