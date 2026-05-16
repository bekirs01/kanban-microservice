import type {
  ResponseTaskDto,
  TaskPriority,
  TaskStatus,
} from "@challenge/types";
import {
  endOfWeek,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";

export interface LabelCount {
  label: string;
  count: number;
}

export interface WeekBucket {
  label: string;
  count: number;
}

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as TaskStatus[];
const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as TaskPriority[];

export function statusDistributionForAnalytics(
  tasks: ResponseTaskDto[],
  labelForStatus: (s: TaskStatus) => string,
): LabelCount[] {
  const counts = new Map<TaskStatus, number>();
  for (const s of STATUSES) counts.set(s, 0);
  for (const t of tasks) {
    counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  }
  return STATUSES.map((s) => ({
    label: labelForStatus(s),
    count: counts.get(s) ?? 0,
  }));
}

export function priorityDistributionForAnalytics(
  tasks: ResponseTaskDto[],
  labelForPriority: (p: TaskPriority) => string,
): LabelCount[] {
  const counts = new Map<TaskPriority, number>();
  for (const p of PRIORITIES) counts.set(p, 0);
  for (const t of tasks) {
    counts.set(t.priority, (counts.get(t.priority) ?? 0) + 1);
  }
  return PRIORITIES.map((p) => ({
    label: labelForPriority(p),
    count: counts.get(p) ?? 0,
  }));
}

export function weeklyCreatedBuckets(
  tasks: ResponseTaskDto[],
  weekStartsOn: 1 | 0,
  weeksBack: number,
  formatWeekLabel: (weekStart: Date) => string,
): WeekBucket[] {
  const now = new Date();
  const buckets: WeekBucket[] = [];
  for (let i = weeksBack - 1; i >= 0; i -= 1) {
    const anchor = subWeeks(now, i);
    const start = startOfWeek(anchor, { weekStartsOn });
    const end = endOfWeek(anchor, { weekStartsOn });
    const startMs = start.getTime();
    const endMs = end.getTime();
    let count = 0;
    for (const t of tasks) {
      const c = new Date(t.createdAt as unknown as string).getTime();
      if (!Number.isNaN(c) && c >= startMs && c <= endMs) count += 1;
    }
    buckets.push({ label: formatWeekLabel(startOfDay(start)), count });
  }
  return buckets;
}

export function maxCount(rows: LabelCount[] | WeekBucket[]): number {
  let m = 0;
  for (const r of rows) m = Math.max(m, r.count);
  return m || 1;
}
