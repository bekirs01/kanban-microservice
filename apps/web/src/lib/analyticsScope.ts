import type { ResponseTaskDto, TaskPriority, TaskStatus } from "@challenge/types";
import {
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { isTaskOverdue } from "@/lib/dashboardDerived";

export type AnalyticsPeriod = "today" | "week" | "month" | "all";

export interface AnalyticsUiFilters {
  period: AnalyticsPeriod;
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  assigneeId: string | "all";
}

export function analyticsPeriodStart(
  period: AnalyticsPeriod,
  ref = new Date(),
): Date | null {
  if (period === "all") return null;
  if (period === "today") return startOfDay(ref);
  if (period === "week") {
    return startOfWeek(ref, { weekStartsOn: 1 });
  }
  return startOfMonth(ref);
}

export function taskCreatedAtTime(task: ResponseTaskDto): number {
  return new Date(task.createdAt as unknown as string).getTime();
}

export function applyAnalyticsFilters(
  tasks: ResponseTaskDto[],
  filters: AnalyticsUiFilters,
  ref = new Date(),
): ResponseTaskDto[] {
  let list = tasks;
  const ps = analyticsPeriodStart(filters.period, ref);
  if (ps) {
    const t0 = ps.getTime();
    list = list.filter((t) => {
      const c = taskCreatedAtTime(t);
      return !Number.isNaN(c) && c >= t0;
    });
  }
  if (filters.status !== "all") {
    list = list.filter((t) => t.status === filters.status);
  }
  if (filters.priority !== "all") {
    list = list.filter((t) => t.priority === filters.priority);
  }
  if (filters.assigneeId !== "all") {
    list = list.filter((t) => (t.assignees ?? []).includes(filters.assigneeId));
  }
  return list;
}

export interface WorkerLoadRow {
  userId: string;
  assigned: number;
  inProgress: number;
  overdue: number;
}

export function computeWorkerLoad(
  tasks: ResponseTaskDto[],
  options: { viewerId?: string; isAdmin: boolean },
): WorkerLoadRow[] {
  const map = new Map<string, WorkerLoadRow>();
  for (const t of tasks) {
    const ids = t.assignees ?? [];
    for (const uid of ids) {
      if (!options.isAdmin && uid !== options.viewerId) continue;
      let row = map.get(uid);
      if (!row) {
        row = { userId: uid, assigned: 0, inProgress: 0, overdue: 0 };
        map.set(uid, row);
      }
      row.assigned += 1;
      if (t.status === "IN_PROGRESS") row.inProgress += 1;
      if (isTaskOverdue(t)) row.overdue += 1;
    }
  }
  const rows = [...map.values()];
  rows.sort((a, b) => b.assigned - a.assigned);
  if (!options.isAdmin && options.viewerId) {
    return rows.filter((r) => r.userId === options.viewerId);
  }
  return rows;
}
