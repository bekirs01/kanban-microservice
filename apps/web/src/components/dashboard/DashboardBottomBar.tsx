import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import {
  computeStats,
  type QuickTaskFilter,
} from "@/lib/dashboardDerived";
import type { ResponseTaskDto } from "@challenge/types";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardBottomBarProps {
  tasks: ResponseTaskDto[];
  viewerId?: string;
  dataUpdatedAt?: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  quickFilter: QuickTaskFilter;
  onQuickFilter: (v: QuickTaskFilter) => void;
}

export function DashboardBottomBar({
  tasks,
  viewerId,
  dataUpdatedAt,
  onRefresh,
  isRefreshing,
  quickFilter,
  onQuickFilter,
}: DashboardBottomBarProps) {
  const { t, dateFnsLocale } = useTranslation();
  const s = computeStats(tasks, viewerId);

  const updated =
    dataUpdatedAt != null
      ? formatDistanceToNow(dataUpdatedAt, {
          addSuffix: true,
          locale: dateFnsLocale,
        })
      : t("common.dash");

  const chip = (id: QuickTaskFilter, label: string, value: number, tone?: "destructive" | "primary") => (
    <button
      key={id}
      type="button"
      onClick={() => onQuickFilter(id)}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        quickFilter === id
          ? "border-primary bg-primary/15 text-primary"
          : "border-transparent bg-muted/60 text-foreground hover:bg-muted",
        tone === "destructive" && quickFilter !== id && value > 0 && "text-destructive",
        tone === "primary" && quickFilter !== id && "text-primary",
      )}
    >
      <span className="text-muted-foreground">{label}</span>{" "}
      <span className="tabular-nums font-semibold">{value}</span>
    </button>
  );

  return (
    <div className="sticky bottom-0 z-30 border-t bg-card/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {chip("overdue", t("dashboard.overdue"), s.overdue, "destructive")}
          {chip("today", t("dashboard.dueToday"), s.dueToday, "primary")}
          {chip("week", t("dashboard.thisWeek"), s.thisWeek)}
          {chip("all", t("dashboard.filterChipAll"), s.total)}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {t("dashboard.lastUpdated", { time: updated })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shadow-sm"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("dashboard.refresh")}
          </Button>
        </div>
      </div>
    </div>
  );
}
