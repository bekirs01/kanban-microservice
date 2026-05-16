import { DashboardAnalyticsSection } from "@/components/dashboard/DashboardAnalyticsSection";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTranslation } from "@/i18n/useTranslation";
import {
  priorityDistributionForAnalytics,
  statusDistributionForAnalytics,
  weeklyCreatedBuckets,
} from "@/lib/dashboardAnalytics";
import { computeStats, uniqueUserIdsFromTasks } from "@/lib/dashboardDerived";
import {
  canManageAssignments,
  isAdminRole,
  sharedBoardQueryFlag,
} from "@/lib/rbac";
import type { TaskPriority, TaskStatus } from "@challenge/types";
import { format } from "date-fns";
import { useMemo } from "react";
import { toast } from "sonner";

export function AnalyticsPage() {
  const { t, dateFnsLocale } = useTranslation();
  const { isConnected } = useWebSocket();
  const { user, logout } = useAuth();

  const { data: tasksData, isLoading } = useTasks({
    page: 1,
    limit: 100,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });

  const tasks = tasksData?.items ?? [];

  const teamIds = useMemo(() => uniqueUserIdsFromTasks(tasks), [tasks]);
  const { data: teamUsers = [] } = useUsersByIds(
    teamIds.length ? teamIds : undefined,
  );

  const stats = computeStats(tasks, user?.id);

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

  const statusRows = statusDistributionForAnalytics(tasks, statusLabel);
  const priorityRows = priorityDistributionForAnalytics(tasks, priorityLabel);
  const weekRows = weeklyCreatedBuckets(
    tasks,
    1,
    8,
    (weekStart) =>
      format(weekStart, "d MMM", {
        locale: dateFnsLocale,
      }),
  );

  const handleLogout = async () => {
    await logout();
    toast.success(t("board.logoutToast"));
  };

  const managerRole = canManageAssignments(user?.role);

  return (
    <div className="flex min-h-screen flex-col bg-muted/25">
      <div className="flex min-h-0 flex-1">
        <DashboardSidebar
          teamUsers={teamUsers}
          showInvite={isAdminRole(user?.role)}
          showParticipantsNav={isAdminRole(user?.role)}
          showAnalyticsNav={managerRole}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader
            isConnected={isConnected}
            user={user}
            layoutMode="kanban"
            onLayoutMode={() => {}}
            onLogout={handleLogout}
            titleKey="analytics.pageTitle"
            showLayoutToggle={false}
          />
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1200px] space-y-6 p-4 pb-16 lg:p-6">
              <p className="text-sm text-muted-foreground">
                {t("analytics.pageSubtitle")}
              </p>

              {isLoading ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.loadingShort")}
                </p>
              ) : (
                <>
                  <DashboardStats stats={stats} />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <DashboardAnalyticsSection
                      title={t("analytics.chartStatusTitle")}
                      rows={statusRows}
                      emptyHint={t("analytics.chartEmpty")}
                    />
                    <DashboardAnalyticsSection
                      title={t("analytics.chartPriorityTitle")}
                      rows={priorityRows}
                      emptyHint={t("analytics.chartEmpty")}
                    />
                    <DashboardAnalyticsSection
                      title={t("analytics.chartCreatedTitle")}
                      rows={weekRows}
                      emptyHint={t("analytics.chartEmpty")}
                      className="lg:col-span-2"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
