import type { ResponseTaskDto, TaskPriority, TaskStatus } from "@challenge/types";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isBefore,
  isSameDay,
  isSameWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type DashboardViewGranularity = "week" | "month";

export type TaskSortMode = "deadline" | "priority" | "created";

const PRIORITY_RANK: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function deadlineYmd(task: ResponseTaskDto): string | null {
  if (!task.deadline) return null;
  const d = new Date(task.deadline as unknown as string | Date);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalYmd(startOfDay(d));
}

export function getPlannerDays(
  anchor: Date,
  granularity: DashboardViewGranularity,
): Date[] {
  if (granularity === "week") {
    return eachDayOfInterval({
      start: startOfWeek(anchor, { weekStartsOn: 1 }),
      end: endOfWeek(anchor, { weekStartsOn: 1 }),
    });
  }
  return eachDayOfInterval({
    start: startOfMonth(anchor),
    end: endOfMonth(anchor),
  });
}

export function countTasksDueOnDay(
  tasks: ResponseTaskDto[],
  day: Date,
): number {
  const ymd = toLocalYmd(startOfDay(day));
  return tasks.reduce((n, t) => (deadlineYmd(t) === ymd ? n + 1 : n), 0);
}

export interface DashboardStats {
  total: number;
  dueToday: number;
  overdue: number;
  inProgress: number;
  done: number;
  assignedToMe: number;
  thisWeek: number;
  unassigned: number;
}

export type QuickTaskFilter = "all" | "overdue" | "today" | "week" | "my";

export function isTaskOverdue(
  task: ResponseTaskDto,
  ref: Date = new Date(),
): boolean {
  if (task.status === "DONE") return false;
  const y = deadlineYmd(task);
  if (!y) return false;
  return isBefore(
    startOfDay(new Date(`${y}T12:00:00`)),
    startOfDay(ref),
  );
}

export function countCreatedToday(
  tasks: ResponseTaskDto[],
  ref: Date = new Date(),
): number {
  const start = startOfDay(ref).getTime();
  let n = 0;
  for (const tsk of tasks) {
    const c = new Date(tsk.createdAt as unknown as string).getTime();
    if (!Number.isNaN(c) && startOfDay(new Date(c)).getTime() === start) {
      n += 1;
    }
  }
  return n;
}

export function computeStats(
  tasks: ResponseTaskDto[],
  viewerId?: string,
): DashboardStats {
  const todayStart = startOfDay(new Date());
  let dueToday = 0;
  let overdue = 0;
  let inProgress = 0;
  let done = 0;
  let assignedToMe = 0;
  let thisWeek = 0;
  let unassigned = 0;

  for (const t of tasks) {
    if (!t.assignees || t.assignees.length === 0) unassigned += 1;
    if (viewerId && (t.assignees || []).includes(viewerId)) {
      assignedToMe += 1;
    }
    if (t.status === "IN_PROGRESS") inProgress += 1;
    if (t.status === "DONE") done += 1;

    const ymd = deadlineYmd(t);
    if (ymd) {
      const d = new Date(`${ymd}T12:00:00`);
      const dayStart = startOfDay(d);
      if (isSameDay(dayStart, todayStart)) dueToday += 1;
      if (t.status !== "DONE" && isBefore(dayStart, todayStart)) overdue += 1;
      if (isSameWeek(d, new Date(), { weekStartsOn: 1 })) {
        thisWeek += 1;
      }
    }
  }

  return {
    total: tasks.length,
    dueToday,
    overdue,
    inProgress,
    done,
    assignedToMe,
    thisWeek,
    unassigned,
  };
}

export interface ClientTaskFilters {
  viewerId?: string;
  quickFilter: QuickTaskFilter;
  searchQuery: string;
  statuses: TaskStatus[] | null;
  priorities: TaskPriority[] | null;
  assigneeId: string | null;
  deadlineFrom: string;
  deadlineTo: string;
  selectedDay: Date | null;
}

export function applyClientTaskFilters(
  tasks: ResponseTaskDto[],
  f: ClientTaskFilters,
): ResponseTaskDto[] {
  let list = [...tasks];
  const q = f.searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }

  const todayStart = startOfDay(new Date());

  if (f.quickFilter === "my" && f.viewerId) {
    list = list.filter((t) => (t.assignees || []).includes(f.viewerId!));
  } else if (f.quickFilter === "overdue") {
    list = list.filter((t) => isTaskOverdue(t));
  } else if (f.quickFilter === "today") {
    list = list.filter((t) => {
      const y = deadlineYmd(t);
      if (!y) return false;
      return isSameDay(
        startOfDay(new Date(`${y}T12:00:00`)),
        todayStart,
      );
    });
  } else if (f.quickFilter === "week") {
    list = list.filter((t) => {
      const y = deadlineYmd(t);
      if (!y) return false;
      return isSameWeek(new Date(`${y}T12:00:00`), new Date(), {
        weekStartsOn: 1,
      });
    });
  }

  if (f.statuses && f.statuses.length > 0) {
    const set = new Set(f.statuses);
    list = list.filter((t) => set.has(t.status));
  }

  if (f.priorities && f.priorities.length > 0) {
    const set = new Set(f.priorities);
    list = list.filter((t) => set.has(t.priority));
  }

  if (f.assigneeId) {
    list = list.filter((t) => (t.assignees || []).includes(f.assigneeId!));
  }

  if (f.deadlineFrom || f.deadlineTo) {
    let from = f.deadlineFrom;
    let to = f.deadlineTo;
    if (from && to && from > to) {
      const s = from;
      from = to;
      to = s;
    }
    list = list.filter((t) => {
      const y = deadlineYmd(t);
      if (!y) return false;
      if (from && y < from) return false;
      if (to && y > to) return false;
      return true;
    });
  }

  if (f.selectedDay) {
    const ymd = toLocalYmd(startOfDay(f.selectedDay));
    list = list.filter((t) => deadlineYmd(t) === ymd);
  }

  return list;
}

export function sortBoardTasks(
  tasks: ResponseTaskDto[],
  mode: TaskSortMode,
): ResponseTaskDto[] {
  const out = [...tasks];
  out.sort((a, b) => {
    if (mode === "priority") {
      const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (pr !== 0) return pr;
    } else if (mode === "deadline") {
      const ad = a.deadline
        ? new Date(a.deadline as unknown as string).getTime()
        : Number.POSITIVE_INFINITY;
      const bd = b.deadline
        ? new Date(b.deadline as unknown as string).getTime()
        : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
    } else {
      const ac = new Date(a.createdAt as unknown as string).getTime();
      const bc = new Date(b.createdAt as unknown as string).getTime();
      if (ac !== bc) return bc - ac;
    }
    return a.title.localeCompare(b.title);
  });
  return out;
}

export function tasksForDay(
  tasks: ResponseTaskDto[],
  day: Date,
): ResponseTaskDto[] {
  const ymd = toLocalYmd(startOfDay(day));
  return tasks.filter((t) => deadlineYmd(t) === ymd);
}

export function upcomingTasks(
  tasks: ResponseTaskDto[],
  from: Date,
  daysAhead: number,
): ResponseTaskDto[] {
  const start = startOfDay(from).getTime();
  const end = start + daysAhead * 86400000;
  return tasks
    .filter((t) => {
      if (!t.deadline) return false;
      const ts = new Date(t.deadline as unknown as string).getTime();
      return ts >= start && ts < end && t.status !== "DONE";
    })
    .sort(
      (a, b) =>
        new Date(a.deadline as unknown as string).getTime() -
        new Date(b.deadline as unknown as string).getTime(),
    );
}

export function uniqueUserIdsFromTasks(tasks: ResponseTaskDto[]): string[] {
  const s = new Set<string>();
  for (const t of tasks) {
    if (t.creatorId) s.add(t.creatorId);
    for (const id of t.assignees || []) s.add(id);
  }
  return [...s];
}

export function plannerRangeLabel(
  anchor: Date,
  granularity: DashboardViewGranularity,
): { start: Date; end: Date } {
  if (granularity === "week") {
    return {
      start: startOfWeek(anchor, { weekStartsOn: 1 }),
      end: endOfWeek(anchor, { weekStartsOn: 1 }),
    };
  }
  return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
}
