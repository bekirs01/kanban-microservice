import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";

function KpiCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="min-w-[140px] flex-1 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

export function DashboardKpiStrip({
  createdToday,
  activeTasks,
  overdue,
  dueWeek,
  completedPct,
}: {
  createdToday: number;
  activeTasks: number;
  overdue: number;
  dueWeek: number;
  completedPct: number;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-5")}>
      <KpiCard
        title={t("dashboard.kpiCreatedToday")}
        value={String(createdToday)}
      />
      <KpiCard
        title={t("dashboard.kpiActiveTasks")}
        value={String(activeTasks)}
      />
      <KpiCard title={t("dashboard.kpiOverdue")} value={String(overdue)} />
      <KpiCard
        title={t("dashboard.kpiDueThisWeek")}
        value={String(dueWeek)}
      />
      <KpiCard
        title={t("dashboard.kpiCompletedRate")}
        value={`${completedPct}%`}
      />
    </div>
  );
}
