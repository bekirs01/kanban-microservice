import { useTranslation } from "@/i18n/useTranslation";
import { formatFriendlyDate } from "@/lib/taskDetailUtils";
import { Calendar, Clock, User } from "lucide-react";
import React from "react";
import type { ResponseTaskDto } from "@challenge/types";

interface Props {
  task: ResponseTaskDto | undefined;
  isEditing: boolean;
  registerTask: any;
  getUsername: (id: string) => string;
}

export const TaskDetailsPanel: React.FC<Props> = ({
  task,
  isEditing,
  registerTask,
  getUsername,
}) => {
  const { t, dateFnsLocale } = useTranslation();

  const deadlineLabel =
    typeof task?.deadline === "string" || task?.deadline instanceof Date
      ? formatFriendlyDate(task.deadline as string | Date, dateFnsLocale, t)
      : t("common.dash");

  const createdDisplay =
    task?.createdAt !== undefined && task.createdAt !== null
      ? formatFriendlyDate(task.createdAt as string | Date, dateFnsLocale, t)
      : t("common.dash");

  const creatorUsername = task?.creatorId ? getUsername(String(task.creatorId)) : t("common.dash");

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {t("task.detailsSectionTitle")}
      </h4>

      <div className="grid gap-4">
        <div className="flex items-center gap-3 text-sm group">
          <div className="p-1.5 rounded-md bg-background border shadow-sm text-muted-foreground group-hover:text-primary transition-colors">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{t("task.creatorLabel")}</p>
            <p className="font-medium text-foreground truncate">
              {creatorUsername}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm group">
          <div className="p-1.5 rounded-md bg-background border shadow-sm text-muted-foreground group-hover:text-primary transition-colors">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{t("task.deadlineLabel")}</p>
            {isEditing ? (
              <input
                type="date"
                className="border-input h-9 rounded-md bg-transparent px-3 text-sm w-full"
                {...registerTask("deadline")}
              />
            ) : (
              <p className="font-medium text-foreground">{deadlineLabel}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm group">
          <div className="p-1.5 rounded-md bg-background border shadow-sm text-muted-foreground group-hover:text-primary transition-colors">
            <Clock className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{t("task.createdLabel")}</p>
            <p className="font-medium text-foreground">{createdDisplay}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsPanel;
