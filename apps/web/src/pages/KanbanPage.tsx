import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/useTranslation";
import type { LocaleCode } from "@/i18n/types";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useWebSocket } from "@/hooks/useWebSocket";
import { isAdminRole, sharedBoardQueryFlag } from "@/lib/rbac";
import type { ResponseTaskDto } from "@challenge/types";
import { LogOut, Plus, Wifi, WifiOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export function KanbanPage() {
  const { t, locale, setLanguage } = useTranslation();
  const { isConnected } = useWebSocket();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { user, logout } = useAuth();

  const { data: tasksData, isLoading } = useTasks({
    page: 1,
    limit: 100,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });

  const tasks = tasksData?.items || [];

  const handleTaskClick = (task: ResponseTaskDto) => {
    setSelectedTaskId(task.id);
  };

  const handleLogout = async () => {
    await logout();
    toast.success(t("board.logoutToast"));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-2xl font-bold">{t("board.title")}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span>{t("board.connected")}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span>{t("board.disconnected")}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {t("common.language")}
                </span>
                <Select
                  value={locale}
                  onValueChange={(next) =>
                    setLanguage(next as LocaleCode)
                  }
                >
                  <SelectTrigger className="h-9 w-[150px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">
                      {t("language.labelEnglish")}
                    </SelectItem>
                    <SelectItem value="ru">
                      {t("language.labelRussian")}
                    </SelectItem>
                    <SelectItem value="tr">
                      {t("language.labelTurkish")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                {t("board.greetingHello", {
                  username: user?.username ?? "",
                })}
              </span>
              {isAdminRole(user?.role) ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin">{t("common.adminPanel")}</Link>
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t("common.logout")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
            {(user?.role ?? "USER") !== "USER" ? (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("board.addTask")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <KanbanBoard
          tasks={tasks}
          isLoading={isLoading}
          onTaskClick={handleTaskClick}
          viewerId={user?.id}
          viewerRole={user?.role}
        />
      </main>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <TaskDetailDialog
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </div>
  );
}
