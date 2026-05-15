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

export const mapTaskToForm = (task: ResponseTaskDto): UpdateTaskFormData => {
  const rawDeadline = task?.deadline
    ? new Date(String(task.deadline))
    : undefined;
  const dateStr = rawDeadline
    ? rawDeadline.toISOString().slice(0, 10)
    : undefined;
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    deadline: dateStr,
    assignees: task.assignees ?? [],
  };
};

export const getFirstName = (fullName?: string): string => {
  if (!fullName) return "";
  return fullName.split(" ")[0] ?? "";
};

export const formatChangedFields = (
  entry: Record<string, unknown>,
  referencedUsers: { id?: string; username?: string }[] = [],
  t: TranslateLookup,
): string => {
  const raw = entry.rawChanges ?? entry.raw_changes ?? entry.changes;
  const content = entry.content ?? entry.contentHtml ?? entry.message;
  if (content) {
    if (typeof content === "string") {
      try {
        const actionRaw = entry.action ?? "";
        const action = typeof actionRaw === "string" ? actionRaw.toUpperCase() : "";
        if (action === "ASSIGNED") {
          let mapped = content as string;
          for (const u of referencedUsers) {
            if (!u || !u.id) continue;
            const username = u.username ?? u.id;
            mapped = mapped.split(u.id).join(username);
          }
          return mapped;
        }
      } catch {
        return content as string;
      }
      return content as string;
    }
    try {
      if (Array.isArray(content)) return content.join(", ");
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }
  if (!raw) {
    const action = typeof entry.action === "string" ? entry.action : "";
    return action || t("history.fallbackUpdated");
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
