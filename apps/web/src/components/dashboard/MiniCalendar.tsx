import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { countTasksDueOnDay } from "@/lib/dashboardDerived";
import { cn } from "@/lib/utils";
import type { ResponseTaskDto } from "@challenge/types";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MiniCalendarProps {
  visibleMonth: Date;
  onMonthChange: (monthStart: Date) => void;
  selectedDay: Date | null;
  onSelectDay: (day: Date) => void;
  tasks?: ResponseTaskDto[];
}

export function MiniCalendar({
  visibleMonth,
  onMonthChange,
  selectedDay,
  onSelectDay,
  tasks,
}: MiniCalendarProps) {
  const { t, dateFnsLocale } = useTranslation();
  const start = startOfMonth(visibleMonth);
  const end = endOfMonth(visibleMonth);
  const firstDow = start.getDay();
  const pad = firstDow === 0 ? 6 : firstDow - 1;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < pad; i += 1) cells.push(null);
  eachDayOfInterval({ start, end }).forEach((d) => cells.push(d));

  const monday = new Date(2025, 0, 6);
  const dowLabels = Array.from({ length: 7 }, (_, i) =>
    format(addDays(monday, i), "EEEEE", { locale: dateFnsLocale }),
  );

  return (
    <div
      id="dashboard-mini-calendar"
      className="rounded-xl border bg-card p-4 shadow-md"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onMonthChange(addMonths(start, -1))}
          aria-label={t("dashboard.miniCalPrevMonth")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="min-w-0 truncate text-center text-sm font-semibold">
          {format(visibleMonth, "LLLL yyyy", { locale: dateFnsLocale })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onMonthChange(addMonths(start, 1))}
          aria-label={t("dashboard.miniCalNextMonth")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {dowLabels.map((l) => (
          <span key={l} className="py-1">
            {l}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) {
            return <div key={`e-${i}`} className="h-8" />;
          }
          const sel = selectedDay && isSameDay(d, selectedDay);
          const inMonth = isSameMonth(d, start);
          const dueN = tasks?.length ? countTasksDueOnDay(tasks, d) : 0;
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelectDay(d)}
              className={cn(
                "flex h-8 flex-col items-center justify-center rounded-md text-xs font-medium transition-colors",
                !inMonth && "text-muted-foreground/40",
                sel
                  ? "bg-primary text-primary-foreground shadow"
                  : "hover:bg-muted",
              )}
            >
              <span>{format(d, "d")}</span>
              {dueN > 0 && !sel ? (
                <span className="mt-0.5 block h-1 w-1 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
