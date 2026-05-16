import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { format } from "date-fns";
import { LogOut, Plus, Wifi, WifiOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function deadlineToLocalYmd(deadline: string | Date): string {
  const d = deadline instanceof Date ? deadline : new Date(deadline);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function KanbanPage() {
  const { t, locale, setLanguage, dateFnsLocale } = useTranslation();
  const { isConnected } = useWebSocket();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deadlineFilterFrom, setDeadlineFilterFrom] = useState("");
  const [deadlineFilterTo, setDeadlineFilterTo] = useState("");

  const { user, logout } = useAuth();

  const { data: tasksData, isLoading } = useTasks({
    page: 1,
    limit: 100,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });

  const tasks = tasksData?.items || [];

  const filteredTasks = useMemo(() => {
    if (!deadlineFilterFrom || !deadlineFilterTo) return tasks;
    let rangeStart = deadlineFilterFrom;
    let rangeEnd = deadlineFilterTo;
    if (rangeStart > rangeEnd) {
      const swap = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = swap;
    }
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      const ymd = deadlineToLocalYmd(task.deadline);
      return ymd >= rangeStart && ymd <= rangeEnd;
    });
  }, [tasks, deadlineFilterFrom, deadlineFilterTo]);

  const deadlineRangeSummary =
    deadlineFilterFrom && deadlineFilterTo
      ? (() => {
          let fromKey = deadlineFilterFrom;
          let toKey = deadlineFilterTo;
          if (fromKey > toKey) {
            const s = fromKey;
            fromKey = toKey;
            toKey = s;
          }
          const fromLabel = format(
            new Date(`${fromKey}T12:00:00`),
            "PP",
            { locale: dateFnsLocale },
          );
          const toLabel = format(new Date(`${toKey}T12:00:00`), "PP", {
            locale: dateFnsLocale,
          });
          return `${fromLabel} – ${toLabel}`;
        })()
      : null;

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
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-sm font-medium text-foreground">
                {t("board.deadlineRangeFilter")}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={deadlineFilterFrom}
                  onChange={(e) => setDeadlineFilterFrom(e.target.value)}
                  aria-label={t("board.dateFilterFromAria")}
                  className="w-[155px] shrink-0 bg-background"
                />
                <span className="text-muted-foreground text-sm">–</span>
                <Input
                  type="date"
                  value={deadlineFilterTo}
                  onChange={(e) => setDeadlineFilterTo(e.target.value)}
                  aria-label={t("board.dateFilterToAria")}
                  className="w-[155px] shrink-0 bg-background"
                />
                {deadlineFilterFrom && deadlineFilterTo ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setDeadlineFilterFrom("");
                      setDeadlineFilterTo("");
                    }}
                  >
                    {t("board.clearDateFilter")}
                  </Button>
                ) : null}
              </div>
              {deadlineRangeSummary ? (
                <p className="text-sm font-semibold text-foreground tracking-tight">
                  {deadlineRangeSummary}
                </p>
              ) : null}
            </div>
            {(user?.role ?? "USER") !== "USER" ? (
              <div className="flex justify-end lg:justify-start shrink-0">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("board.addTask")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <KanbanBoard
          tasks={filteredTasks}
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
