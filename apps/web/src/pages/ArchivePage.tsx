import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTasks, useUnarchiveTask } from "@/hooks/useTasks";
import { useTranslation } from "@/i18n/useTranslation";
import { sharedBoardQueryFlag } from "@/lib/rbac";
import type { ResponseTaskDto } from "@challenge/types";
import { format } from "date-fns";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";

export function ArchivePage() {
  const { t, dateFnsLocale } = useTranslation();
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasksData, isLoading } = useTasks({
    page: 1,
    limit: 100,
    archived: true,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });

  const unarchiveTask = useUnarchiveTask();

  const tasks = tasksData?.items ?? [];

  const handleRestore = async (e: MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      await unarchiveTask.mutateAsync(taskId);
      toast.success(t("archive.toastRestored"));
      if (selectedTaskId === taskId) setSelectedTaskId(null);
    } catch {
      toast.error(t("archive.errorRestore"));
    }
  };

  const archivedOnLabel = (task: ResponseTaskDto) => {
    const raw = task.archivedAt;
    if (raw == null) return t("common.dash");
    return format(new Date(String(raw)), "d MMM yyyy", {
      locale: dateFnsLocale,
    });
  };

  return (
    <AuthenticatedShell headerTitleKey="archive.pageTitle">
      <div className="mx-auto max-w-[900px] space-y-4 p-4 pb-16 lg:p-6">
        <p className="text-sm text-muted-foreground">{t("archive.pageSubtitle")}</p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loadingShort")}</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("archive.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => setSelectedTaskId(task.id)}
                  className="flex w-full items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("archive.archivedOnLabel", {
                        date: archivedOnLabel(task),
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={unarchiveTask.isPending}
                    onClick={(e) => handleRestore(e, task.id)}
                  >
                    {t("archive.restoreButton")}
                  </Button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TaskDetailDialog
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </AuthenticatedShell>
  );
}
