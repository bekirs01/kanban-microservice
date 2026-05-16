import { useTranslation } from "@/i18n/useTranslation";
import type { DashboardStats as DashboardStatsModel } from "@/lib/dashboardDerived";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  stats: DashboardStatsModel;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const { t } = useTranslation();

  const cells: { label: string; value: number; className?: string }[] = [
    { label: t("dashboard.totalTasks"), value: stats.total },
    { label: t("dashboard.dueToday"), value: stats.dueToday },
    {
      label: t("dashboard.overdue"),
      value: stats.overdue,
      className: stats.overdue > 0 ? "text-destructive" : undefined,
    },
    { label: t("dashboard.thisWeek"), value: stats.thisWeek },
    { label: t("dashboard.inProgress"), value: stats.inProgress },
    { label: t("dashboard.done"), value: stats.done },
    { label: t("dashboard.assignedToMe"), value: stats.assignedToMe },
    { label: t("dashboard.unassigned"), value: stats.unassigned },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border bg-card px-4 py-3 shadow-md"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {c.label}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
              c.className,
            )}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
