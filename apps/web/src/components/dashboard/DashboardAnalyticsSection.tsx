import type { LabelCount, WeekBucket } from "@/lib/dashboardAnalytics";
import { maxCount } from "@/lib/dashboardAnalytics";
import { cn } from "@/lib/utils";

function BarRow({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const pct = Math.round((count / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="tabular-nums font-semibold text-foreground">{count}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/80 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardAnalyticsSection({
  title,
  rows,
  emptyHint,
  className,
}: {
  title: string;
  rows: LabelCount[] | WeekBucket[];
  emptyHint: string;
  className?: string;
}) {
  const m = maxCount(rows);
  const total = rows.reduce((acc, r) => acc + r.count, 0);

  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-4 shadow-md sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {total}
        </span>
      </div>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <BarRow key={r.label} label={r.label} count={r.count} max={m} />
          ))}
        </div>
      )}
    </section>
  );
}
