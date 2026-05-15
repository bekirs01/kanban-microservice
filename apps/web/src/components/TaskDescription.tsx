import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/useTranslation";
import type { ResponseTaskDto } from "@challenge/types";
import React from "react";

interface Props {
  task: ResponseTaskDto | undefined;
  isLoading: boolean;
  isEditing: boolean;
  registerTask: any;
  taskErrors: any;
}

export const TaskDescription: React.FC<Props> = ({
  task,
  isLoading,
  isEditing,
  registerTask,
  taskErrors,
}) => {
  const { t } = useTranslation();

  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        {t("task.descriptionSection")}
      </h3>
      {isEditing ? (
        <div>
          <Textarea
            placeholder={t("task.descriptionPlaceholder")}
            className="min-h-40 resize-none bg-background"
            {...registerTask("description")}
          />
          {taskErrors.description ? (
            <p className="text-xs text-destructive mt-1 ml-1">
              {taskErrors.description.message as string}
            </p>
          ) : null}
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : (
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {typeof task?.description === "string" && task.description.length > 0
            ? task.description
            : t("task.noDescriptionProvided")}
        </div>
      )}
    </section>
  );
};

export default TaskDescription;
