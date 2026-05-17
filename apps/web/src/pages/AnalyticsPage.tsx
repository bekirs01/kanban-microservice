import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { useTranslation } from "@/i18n/useTranslation";
import {
  applyAnalyticsFilters,
  type AnalyticsUiFilters,
} from "@/lib/analyticsScope";
import { uniqueUserIdsFromTasks } from "@/lib/dashboardDerived";
import {
  isAdminRole,
  seesOnlyAssignedTasks,
  sharedBoardQueryFlag,
} from "@/lib/rbac";
import { listAdminUsers } from "@/services/admin.service";
import type { TaskPriority, TaskStatus } from "@challenge/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const admin = isAdminRole(user?.role);

  const [filters, setFilters] = useState<AnalyticsUiFilters>({
    period: "all",
    status: "all",
    priority: "all",
    assigneeId: "all",
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasksData, isLoading } = useTasks({
    page: 1,
    limit: 500,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });

  const raw = tasksData?.items ?? [];

  const rbacTasks = useMemo(() => {
    if (!user?.id) return raw;
    if (!seesOnlyAssignedTasks(user.role)) return raw;
    return raw.filter((x) => (x.assignees ?? []).includes(user.id));
  }, [raw, user?.id, user?.role]);

  const uniqueIds = useMemo(
    () => uniqueUserIdsFromTasks(rbacTasks),
    [rbacTasks],
  );

  const { data: usersByIds = [] } = useUsersByIds(uniqueIds);

  const { data: adminUsers = [] } = useQuery({
    queryKey: ["adminUsersDirectory"],
    queryFn: listAdminUsers,
    enabled: admin,
  });

  const workerDirectory = useMemo(() => {
    if (admin) {
      return adminUsers.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
      }));
    }
    return usersByIds.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
    }));
  }, [admin, adminUsers, usersByIds]);

  const filteredTasks = useMemo(
    () => applyAnalyticsFilters(rbacTasks, filters),
    [rbacTasks, filters],
  );

  const statusLabel = (s: TaskStatus) => {
    const map: Record<TaskStatus, string> = {
      TODO: t("board.columns.todo"),
      IN_PROGRESS: t("board.columns.inProgress"),
      REVIEW: t("board.columns.review"),
      DONE: t("board.columns.done"),
    };
    return map[s];
  };

  const priorityLabel = (p: TaskPriority) =>
    t(`task.priority.${p.toLowerCase() as "low" | "medium" | "high" | "urgent"}`);

  return (
    <AuthenticatedShell headerTitleKey="analytics.title">
      {isLoading ? (
        <p className="p-6 text-sm text-muted-foreground">{t("common.loadingShort")}</p>
      ) : (
        <>
          <AnalyticsDashboard
            tasks={filteredTasks}
            filters={filters}
            onFiltersChange={setFilters}
            isAdmin={admin}
            viewerId={user?.id}
            workerDirectory={workerDirectory}
            statusLabel={statusLabel}
            priorityLabel={priorityLabel}
            onTaskOpen={(id) => setSelectedTaskId(id)}
          />
          <TaskDetailDialog
            taskId={selectedTaskId}
            open={!!selectedTaskId}
            onOpenChange={(open) => {
              if (!open) setSelectedTaskId(null);
            }}
          />
        </>
      )}
    </AuthenticatedShell>
  );
}
