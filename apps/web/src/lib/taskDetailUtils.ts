import type { ResponseTaskDto } from "@challenge/types";
import { format, isToday, isTomorrow } from "date-fns";
import type { Locale } from "date-fns";
import type { UpdateTaskFormData } from "@/lib/schemas";

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-green-50 text-green-800 border-green-200",
  MEDIUM: "bg-yellow-50 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-50 text-orange-800 border-orange-200",
  URGENT: "bg-rose-50 text-rose-800 border-rose-200",
};

type TranslateLookup = (key: string, vars?: Record<string, string | number>) => string;

export const formatFriendlyDate = (
  input: string | Date | undefined,
  locale: Locale,
  t: TranslateLookup,
): string => {
  if (!input) return t("common.dash");
  const d = typeof input === "string" ? new Date(input) : input;
  if (isToday(d)) return t("history.dateRelativeToday");
  if (isTomorrow(d)) return t("history.dateRelativeTomorrow");
  return format(d, "dd MMM yy", { locale });
};

export const formatFriendlyDateTime = (
  input: string | Date | undefined,
  locale: Locale,
  t: TranslateLookup,
): string => {
  if (!input) return t("common.dash");
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return t("common.dash");
  const timeStr = format(d, "HH:mm", { locale });
  if (isToday(d)) return `${t("history.dateRelativeToday")} · ${timeStr}`;
  if (isTomorrow(d)) return `${t("history.dateRelativeTomorrow")} · ${timeStr}`;
  return `${format(d, "dd MMM yy", { locale })} · ${timeStr}`;
};

export const mapTaskToForm = (task: ResponseTaskDto): UpdateTaskFormData => {
  const rawDeadline = task?.deadline
    ? new Date(String(task.deadline))
    : undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateTimeLocal =
    rawDeadline && !Number.isNaN(rawDeadline.getTime())
      ? `${rawDeadline.getFullYear()}-${pad(rawDeadline.getMonth() + 1)}-${pad(rawDeadline.getDate())}T${pad(rawDeadline.getHours())}:${pad(rawDeadline.getMinutes())}`
      : undefined;
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    deadline: dateTimeLocal,
    assignees: task.assignees ?? [],
  };
};

export const getFirstName = (fullName?: string): string => {
  if (!fullName) return "";
  return fullName.split(" ")[0] ?? "";
};

function normalizeAssignees(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [String(value)];
}

const STATUS_TO_I18N: Record<string, string> = {
  TODO: "board.columns.todo",
  IN_PROGRESS: "board.columns.inProgress",
  REVIEW: "board.columns.review",
  DONE: "board.columns.done",
};

function resolveUserNames(
  ids: string[],
  referencedUsers: { id?: string; username?: string }[],
): string {
  const idToName = (id: string) => {
    const u = referencedUsers.find((x) => x?.id === id);
    return u?.username ?? id;
  };
  return ids.map(idToName).join(", ");
}

export const formatChangedFields = (
  entry: Record<string, unknown>,
  referencedUsers: { id?: string; username?: string }[] = [],
  t: TranslateLookup,
): string => {
  const raw = entry.rawChanges ?? entry.raw_changes ?? entry.changes;
  const rawTyped = raw as
    | { old?: Record<string, unknown>; new?: Record<string, unknown> }
    | null
    | undefined;
  const oldObj =
    rawTyped?.old && typeof rawTyped.old === "object"
      ? (rawTyped.old as Record<string, unknown>)
      : {};
  const newObj =
    rawTyped?.new && typeof rawTyped.new === "object"
      ? (rawTyped.new as Record<string, unknown>)
      : {};

  const actionRaw = entry.action;
  const action = typeof actionRaw === "string" ? actionRaw.toUpperCase() : "";

  const formatAssignedDescription = (): string => {
    const oldAssignees = normalizeAssignees(oldObj.assignees);
    const newAssignees = normalizeAssignees(newObj.assignees);
    const oldSet = new Set(oldAssignees);
    const newSet = new Set(newAssignees);
    const added = newAssignees.filter((a) => !oldSet.has(a));
    const removed = oldAssignees.filter((a) => !newSet.has(a));

    if (added.length && !removed.length) {
      return t("history.assignedAdded", {
        names: resolveUserNames(added, referencedUsers),
      });
    }
    if (removed.length && !added.length) {
      return t("history.assignedRemoved", {
        names: resolveUserNames(removed, referencedUsers),
      });
    }
    if (added.length && removed.length) {
      return t("history.assignedBoth", {
        added: resolveUserNames(added, referencedUsers),
        removed: resolveUserNames(removed, referencedUsers),
      });
    }
    return t("history.changeGeneric");
  };

  switch (action) {
    case "ASSIGNED":
      return formatAssignedDescription();
    case "STATUS_CHANGE": {
      const statusRaw = newObj.status;
      const col =
        typeof statusRaw === "string"
          ? (STATUS_TO_I18N[statusRaw] ?? "board.columns.todo")
          : "board.columns.todo";
      return t("history.statusChanged", { status: t(col) });
    }
    case "UPDATE":
      return t("history.fallbackUpdated");
    case "CREATED": {
      const titleRaw = newObj.title;
      const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
      if (title) return t("history.createdTaskWithTitle", { title });
      return t("history.createdTask");
    }
    case "COMMENT":
      return t("history.commentAdded");
    case "DELETE":
      return t("history.deletedTask");
    default:
      break;
  }

  if (!raw) {
    return action ? t("history.changeGeneric") : t("history.fallbackUpdated");
  }
  const keys = Array.isArray(raw)
    ? raw
    : Object.keys(raw as object).filter(Boolean);
  const human = (keys as string[])
    .map((key) =>
      String(key)
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim(),
    )
    .join(", ");
  const prefix = t("history.prefixChangedFields").trimEnd();
  return human ? `${prefix} ${human}` : t("history.fallbackUpdated");
};
