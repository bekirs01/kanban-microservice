import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import type { QuickTaskFilter } from "@/lib/dashboardDerived";
import { cn } from "@/lib/utils";

const IDS: QuickTaskFilter[] = [
  "all",
  "overdue",
  "today",
  "week",
  "my",
];

const LABEL_KEYS: Record<QuickTaskFilter, string> = {
  all: "dashboard.filterChipAll",
  overdue: "dashboard.filterChipOverdue",
  today: "dashboard.filterChipToday",
  week: "dashboard.filterChipWeek",
  my: "dashboard.filterChipMy",
};

interface DashboardFilterChipsProps {
  value: QuickTaskFilter;
  onChange: (v: QuickTaskFilter) => void;
}

export function DashboardFilterChips({
  value,
  onChange,
}: DashboardFilterChipsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline">
        {t("dashboard.quickFilters")}
      </span>
      {IDS.map((id) => (
        <Button
          key={id}
          type="button"
          size="sm"
          variant={value === id ? "default" : "outline"}
          className={cn("h-8 rounded-full px-3 text-xs font-medium shadow-none")}
          onClick={() => onChange(id)}
        >
          {t(LABEL_KEYS[id])}
        </Button>
      ))}
    </div>
  );
}
