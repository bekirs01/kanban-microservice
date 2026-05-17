import type { LabelCount, WeekBucket } from "@/lib/dashboardAnalytics";
import { maxCount } from "@/lib/dashboardAnalytics";
import { cn } from "@/lib/utils";
import { useEffect, useId, useMemo, useState } from "react";

const SEGMENT_COLORS = [
  "text-primary",
  "text-emerald-500",
  "text-amber-500",
  "text-violet-500",
  "text-sky-500",
  "text-rose-500",
];

const SEGMENT_SOLID_BAR: Record<string, string> = {
  "text-primary": "bg-primary",
  "text-emerald-500": "bg-emerald-500",
  "text-amber-500": "bg-amber-500",
  "text-violet-500": "bg-violet-500",
  "text-sky-500": "bg-sky-500",
  "text-rose-500": "bg-rose-500",
};

function solidBarClassForSegment(colorClass: string): string {
  return SEGMENT_SOLID_BAR[colorClass] ?? "bg-primary";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function useReveal(enabled: boolean) {
  const [shown, setShown] = useState(!enabled);
  useEffect(() => {
    if (!enabled) {
      setShown(true);
      return;
    }
    setShown(false);
    const id = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(id);
  }, [enabled]);
  return shown;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function donutWedgePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
  return `M ${cx} ${cy} L ${end.x} ${end.y} A ${r} ${r} 0 ${largeArc} 1 ${start.x} ${start.y} Z`;
}

function DistributionDonut({
  rows,
  total,
  reveal,
  reducedMotion,
}: {
  rows: { label: string; count: number; colorClass: string }[];
  total: number;
  reveal: boolean;
  reducedMotion: boolean;
}) {
  const cx = 72;
  const cy = 72;
  const r = 56;
  let angle = -Math.PI / 2;
  const segments = rows
    .filter((row) => row.count > 0)
    .map((row) => {
      const frac = row.count / total;
      const a0 = angle;
      const a1 = angle + frac * 2 * Math.PI;
      angle = a1;
      return {
        ...row,
        path: donutWedgePath(cx, cy, r, a0, a1),
      };
    });

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
      <svg
        viewBox="0 0 144 144"
        className="h-32 w-32 shrink-0 drop-shadow-sm sm:h-36 sm:w-36"
        aria-hidden
      >
        <circle cx={cx} cy={cy} r={r * 0.52} className="fill-muted/50" />
        {segments.map((s, i) => (
          <path
            key={s.label}
            d={s.path}
            className={cn(
              "fill-current transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              s.colorClass,
              reducedMotion ? "opacity-100" : "opacity-0 scale-95",
              reveal && !reducedMotion && "opacity-100 scale-100",
              reveal && reducedMotion && "opacity-100",
            )}
            style={
              reducedMotion || !reveal
                ? undefined
                : { transitionDelay: `${i * 55}ms` }
            }
          />
        ))}
      </svg>
      <ul className="grid w-full max-w-[220px] gap-2 text-xs">
        {rows.map((row, i) => (
          <li
            key={row.label}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1 transition-[opacity,transform] duration-500",
              reducedMotion ? "opacity-100" : "opacity-0 translate-y-1",
              reveal && "opacity-100 translate-y-0",
            )}
            style={
              reducedMotion || !reveal
                ? undefined
                : { transitionDelay: `${120 + i * 45}ms` }
            }
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full bg-current",
                  row.colorClass,
                )}
              />
              <span className="truncate text-muted-foreground">
                {row.label}
              </span>
            </span>
            <span className="tabular-nums font-semibold text-foreground">
              {row.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnimatedBarRow({
  label,
  count,
  max,
  reveal,
  reducedMotion,
  delayMs,
  fillClass,
}: {
  label: string;
  count: number;
  max: number;
  reveal: boolean;
  reducedMotion: boolean;
  delayMs: number;
  fillClass: string;
}) {
  const pct = Math.round((count / max) * 100);
  const width = reducedMotion ? pct : reveal ? pct : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="tabular-nums font-semibold text-foreground">
          {count}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full shadow-sm transition-[width] duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            fillClass,
          )}
          style={{
            width: `${width}%`,
            transitionDelay:
              reducedMotion || !reveal ? undefined : `${delayMs}ms`,
          }}
        />
      </div>
    </div>
  );
}

function TrendChart({
  rows,
  reveal,
  reducedMotion,
}: {
  rows: LabelCount[] | WeekBucket[];
  reveal: boolean;
  reducedMotion: boolean;
}) {
  const gradId = useId().replace(/:/g, "");
  const w = 380;
  const h = 148;
  const padX = 18;
  const padBottom = 34;
  const topPad = 14;
  const chartH = h - padBottom - topPad;
  const max = Math.max(1, ...rows.map((r) => r.count));
  const innerW = w - padX * 2;
  const gap = 10;
  const barCount = rows.length;
  const barW = Math.max(
    16,
    (innerW - gap * Math.max(barCount - 1, 0)) / Math.max(barCount, 1),
  );

  const points = useMemo(() => {
    return rows.map((r, i) => {
      const cx = padX + barW / 2 + i * (barW + gap);
      const fullBarH = chartH * (r.count / max);
      const bh = reducedMotion || reveal ? fullBarH : 0;
      const yBase = topPad + chartH;
      const yTop = yBase - bh;
      return {
        label: r.label,
        cx,
        bh,
        yTop,
        yBase,
        fullBarH,
        count: r.count,
      };
    });
  }, [rows, chartH, max, padX, barW, gap, reducedMotion, reveal, topPad]);

  const linePath = useMemo(() => {
    if (!points.length) return "";
    const yBase = topPad + chartH;
    return points
      .map((p, i) => {
        const x = p.cx;
        const y =
          reducedMotion || reveal ? yBase - p.fullBarH * 0.55 : yBase;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [points, reducedMotion, reveal, chartH, topPad]);

  const lineLen = 420;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mx-auto min-w-[300px] max-w-full text-primary"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        {points.map((p, i) => (
          <rect
            key={p.label}
            x={p.cx - barW / 2}
            y={p.yTop}
            width={barW}
            height={p.bh}
            rx={6}
            fill={`url(#${gradId})`}
            className="transition-[height,y] duration-[950ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transitionDelay:
                reducedMotion || !reveal ? undefined : `${i * 72}ms`,
            }}
          />
        ))}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={lineLen}
          strokeDashoffset={reducedMotion || reveal ? 0 : lineLen}
          className="transition-[stroke-dashoffset] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
        {points.map((p, i) => {
          const yBase = topPad + chartH;
          const cy =
            reducedMotion || reveal ? yBase - p.fullBarH * 0.55 : yBase;
          return (
            <circle
              key={`dot-${p.label}`}
              cx={p.cx}
              cy={cy}
              r={reducedMotion || reveal ? 4 : 0}
              className="fill-background stroke-current transition-[r] duration-500"
              strokeWidth={2}
              style={{
                transitionDelay:
                  reducedMotion || !reveal ? undefined : `${280 + i * 75}ms`,
              }}
            />
          );
        })}
        {points.map((p) => {
          const short =
            p.label.length > 11 ? `${p.label.slice(0, 10)}…` : p.label;
          return (
            <text
              key={`lbl-${p.label}`}
              x={p.cx}
              y={h - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {short}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function DashboardAnalyticsSection({
  title,
  rows,
  emptyHint,
  className,
  visualVariant = "distribution",
}: {
  title: string;
  rows: LabelCount[] | WeekBucket[];
  emptyHint: string;
  className?: string;
  visualVariant?: "distribution" | "trend";
}) {
  const reducedMotion = usePrefersReducedMotion();
  const total = rows.reduce((acc, r) => acc + r.count, 0);
  const m = maxCount(rows);
  const reveal = useReveal(total > 0 && !reducedMotion);

  const coloredRows = useMemo(
    () =>
      rows.map((r, i) => ({
        ...r,
        colorClass: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      })),
    [rows],
  );

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
      ) : visualVariant === "trend" ? (
        <TrendChart
          rows={rows}
          reveal={reveal || reducedMotion}
          reducedMotion={reducedMotion}
        />
      ) : (
        <div className="space-y-5">
          <DistributionDonut
            rows={coloredRows}
            total={total}
            reveal={reveal || reducedMotion}
            reducedMotion={reducedMotion}
          />
          <div className="space-y-3 border-t pt-4">
            {coloredRows.map((r, i) => (
              <AnimatedBarRow
                key={r.label}
                label={r.label}
                count={r.count}
                max={m}
                reveal={reveal || reducedMotion}
                reducedMotion={reducedMotion}
                delayMs={80 + i * 70}
                fillClass={solidBarClassForSegment(r.colorClass)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
