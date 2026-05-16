import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/useTranslation";
import { PRIORITY_COLORS, formatFriendlyDate } from "@/lib/taskDetailUtils";
import type {
  ResponseTaskDto,
  TaskPriority,
  TaskStatus,
} from "@challenge/types";
import React from "react";

const TASK_STATUS_TRANSLATION_KEY: Partial<Record<TaskStatus, string>> = {
  TODO: "board.columns.todo",
  IN_PROGRESS: "board.columns.inProgress",
  REVIEW: "board.columns.review",
  DONE: "board.columns.done",
};

interface Props {
  task: ResponseTaskDto | undefined;
  taskId: string | null;
  isLoading: boolean;
  isEditing: boolean;
  canEditOrDelete?: boolean;
  showApproveArchive?: boolean;
  showRestore?: boolean;
  isArchiveBusy?: boolean;
  onApproveArchive?: () => void;
  onRestoreFromArchive?: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  registerTask: any;
}

function priorityTranslationKey(level: TaskPriority): string {
  const map: Record<string, string> = {
    LOW: "task.priority.low",
    MEDIUM: "task.priority.medium",
    HIGH: "task.priority.high",
    URGENT: "task.priority.urgent",
  };
  return map[level];
}

export const TaskDetailHeader: React.FC<Props> = ({
  task,
  taskId,
  isLoading,
  isEditing,
  canEditOrDelete = true,
  showApproveArchive = false,
  showRestore = false,
  isArchiveBusy = false,
  onApproveArchive,
  onRestoreFromArchive,
  onStartEdit,
  onCancelEdit,
  onDelete,
  registerTask,
}) => {
  const { t, dateFnsLocale } = useTranslation();

  const createdSnippet = task?.createdAt
    ? formatFriendlyDate(String(task.createdAt), dateFnsLocale, t)
    : t("common.dash");

  let statusTranslationKey =
    TASK_STATUS_TRANSLATION_KEY[task?.status as TaskStatus] ??
    "board.columns.todo";

  if (typeof task?.status !== "string") {
    statusTranslationKey = "board.columns.todo";
  }

  return (
    <div className="flex items-start justify-between px-8 py-6 border-b bg-background z-10 shrink-0">
      <div className="flex-1 min-w-0 mr-8">
        {isLoading ? (
          <Skeleton className="h-8 w-1/2 mb-2" />
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-muted-foreground text-xs font-mono mb-2 uppercase tracking-wider">
              <span>{taskId?.split("-")[0] ?? "TASK"}</span>
              <span>•</span>
              <span>
                {isEditing
                  ? t("task.editingMode")
                  : t("task.createdOnFormatted", { date: createdSnippet })}
              </span>
            </div>
            {isEditing ? (
              <Input
                placeholder={t("task.titlePlaceholder")}
                className="text-2xl font-semibold tracking-tight text-foreground leading-tight"
                {...registerTask("title")}
              />
            ) : (
              <h2 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {String(task?.title ?? "")}
              </h2>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          {isEditing ? (
            <select
              className="border-input h-9 rounded-md bg-transparent px-3 text-sm"
              {...registerTask("priority")}
            >
              <option value="LOW">{t("task.priority.low")}</option>
              <option value="MEDIUM">{t("task.priority.medium")}</option>
              <option value="HIGH">{t("task.priority.high")}</option>
              <option value="URGENT">{t("task.priority.urgent")}</option>
            </select>
          ) : (
            task && (
              <>
                <Badge
                  variant="outline"
                  className={PRIORITY_COLORS[String(task.priority) as TaskPriority]}
                >
                  {t(priorityTranslationKey(task.priority as TaskPriority))}
                </Badge>
                <Badge variant="secondary" className="font-medium">
                  {t(statusTranslationKey)}
                </Badge>
                {task.archivedAt ? (
                  <Badge variant="outline" className="font-medium border-dashed">
                    {t("archive.archivedBadge")}
                  </Badge>
                ) : null}
              </>
            )
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
        {!isLoading && task && !isEditing && showApproveArchive && onApproveArchive ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={isArchiveBusy}
            onClick={onApproveArchive}
          >
            {t("archive.approveButton")}
          </Button>
        ) : null}
        {!isLoading && task && !isEditing && showRestore && onRestoreFromArchive ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={isArchiveBusy}
            onClick={onRestoreFromArchive}
          >
            {t("archive.restoreButton")}
          </Button>
        ) : null}
        {!isLoading && task && !isEditing && canEditOrDelete ? (
          <>
            <Button variant="ghost" size="sm" onClick={onStartEdit}>
              {t("common.edit")}
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              {t("common.delete")}
            </Button>
          </>
        ) : null}
        {!isLoading && task && isEditing && canEditOrDelete ? (
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default TaskDetailHeader;
