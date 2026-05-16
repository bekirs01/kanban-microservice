import { useTranslation } from "@/i18n/useTranslation";

export function DashboardActivityPanel() {
  const { t } = useTranslation();

  return (
    <div
      id="dashboard-activity"
      className="rounded-xl border bg-card p-4 shadow-md"
    >
      <h3 className="text-sm font-semibold leading-tight">
        {t("dashboard.activityTitle")}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t("dashboard.activityEmpty")}
      </p>
    </div>
  );
}
