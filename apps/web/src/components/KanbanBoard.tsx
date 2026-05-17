import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/i18n/useTranslation";
import { canDragTaskOnBoard } from "@/lib/rbac";
import { isTaskOverdue } from "@/lib/dashboardDerived";
import { useUpdateTask } from "@/hooks/useTasks";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { cn } from "@/lib/utils";
import { displayUsername, userInitials } from "@/lib/userDisplay";
import type { ResponseTaskDto, ResponseUserDto, TaskStatus } from "@challenge/types";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  URGENT: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
};

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
type StatusValue = (typeof STATUSES)[number];

const BOARD_STATUS_KEYS: Record<StatusValue, string> = {
  TODO: "board.columns.todo",
  IN_PROGRESS: "board.columns.inProgress",
  REVIEW: "board.columns.review",
  DONE: "board.columns.done",
};

type BoardViewerRole = ResponseUserDto["role"];

interface KanbanBoardProps {
  tasks: ResponseTaskDto[];
  isLoading?: boolean;
  onTaskClick: (task: ResponseTaskDto) => void;
  viewerId?: string;
  viewerRole?: BoardViewerRole;
  className?: string;
}

export function KanbanBoard({
  tasks,
  isLoading,
  onTaskClick,
  viewerId,
  viewerRole,
  className,
}: KanbanBoardProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const updateTask = useUpdateTask();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeId),
    [tasks, activeId],
  );

  const getTasksByStatus = (status: StatusValue) =>
    tasks.filter((task) => task.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((item) => item.id === taskId);

    if (task && task.status !== newStatus) {
      updateTask.mutate(
        { id: taskId, data: { status: newStatus } },
        {
          onSuccess: () => toast.success(t("task.moveSuccess")),
          onError: () => toast.error(t("task.moveError")),
        },
      );
    }
    setActiveId(null);
  };

  if (isLoading) {
    return <KanbanSkeleton />;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "grid h-full min-h-0 grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4",
          className,
        )}
      >
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            title={t(BOARD_STATUS_KEYS[status])}
            tasks={getTasksByStatus(status)}
            onTaskClick={onTaskClick}
            viewerId={viewerId}
            viewerRole={viewerRole}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} isOverlay isDraggable />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  title,
  tasks,
  onTaskClick,
  viewerId,
  viewerRole,
}: {
  status: StatusValue;
  title: string;
  tasks: ResponseTaskDto[];
  onTaskClick: (task: ResponseTaskDto) => void;
  viewerId?: string;
  viewerRole?: BoardViewerRole;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm tracking-tight text-foreground/80 uppercase">
            {title}
          </h3>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 h-5 min-w-5 justify-center"
          >
            {tasks.length}
          </Badge>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col rounded-xl border border-transparent bg-muted/30 p-2 transition-colors min-h-[120px]",
          isOver && "bg-muted/60 border-primary/10 ring-2 ring-primary/5",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain pr-1">
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-6 text-center">
              {t("board.emptyColumn")}
            </p>
          ) : null}
          {tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              viewerId={viewerId}
              viewerRole={viewerRole}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DraggableTaskCard({
  task,
  onClick,
  viewerId,
  viewerRole,
}: {
  task: ResponseTaskDto;
  onClick: () => void;
  viewerId?: string;
  viewerRole?: BoardViewerRole;
}) {
  const canDrag = canDragTaskOnBoard(viewerRole, viewerId, task);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      disabled: !canDrag,
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-0 min-h-[6.25rem] rounded-xl bg-muted border-2 border-dashed"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`outline-none ${canDrag ? "" : "touch-none cursor-default select-none"}`}
    >
      <TaskCard task={task} isDraggable={canDrag} />
    </div>
  );
}

function priorityLabelKey(priority: string): string {
  return `task.priority.${priority.toLowerCase()}`;
}

function TaskCard({
  task,
  isOverlay,
  isDraggable = true,
}: {
  task: ResponseTaskDto;
  isOverlay?: boolean;
  isDraggable?: boolean;
}) {
  const { t, dateFnsLocale } = useTranslation();
  const overdue = isTaskOverdue(task);
  const progressPct =
    task.status === "DONE"
      ? 100
      : task.status === "REVIEW"
        ? 78
        : task.status === "IN_PROGRESS"
          ? 45
          : 12;

  return (
    <Card
      className={cn(
        "min-h-[6.25rem] min-w-0 max-w-full overflow-hidden rounded-xl border-border/60 bg-card py-0 shadow-sm transition-all duration-150 group hover:border-border hover:shadow-md",
        overdue && "border-l-[3px] border-l-destructive",
        isDraggable &&
          !isOverlay &&
          "cursor-grab active:cursor-grabbing",
        !isDraggable &&
          !isOverlay &&
          "cursor-default hover:shadow-sm",
        isOverlay &&
          "rotate-2 shadow-xl cursor-grabbing ring-1 ring-primary/20 scale-[1.02] z-50 min-h-[6.25rem]",
      )}
    >
      <CardContent className="flex min-w-0 flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          <h4
            className="min-w-0 flex-1 line-clamp-2 break-words text-sm font-semibold leading-snug text-foreground transition-colors [overflow-wrap:anywhere] group-hover:text-primary"
            title={task.title}
          >
            {task.title}
          </h4>
          <div className="flex shrink-0 flex-col items-end gap-1 pt-px">
            <Badge
              variant="outline"
              className={cn(
                "h-6 shrink-0 rounded-md border px-2 py-0 text-[11px] font-medium leading-none",
                PRIORITY_STYLES[task.priority],
              )}
            >
              {t(priorityLabelKey(task.priority))}
            </Badge>
            {overdue ? (
              <Badge
                variant="outline"
                className="h-6 shrink-0 rounded-md border px-2 py-0 text-[10px] leading-none border-destructive/50 text-destructive"
              >
                {t("dashboard.overdue")}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
            <Calendar className="size-3.5 shrink-0 opacity-75" aria-hidden />
            <span>
              {task.deadline
                ? format(new Date(task.deadline), "dd MMM yy", {
                    locale: dateFnsLocale,
                  })
                : t("dashboard.noDeadlineShort")}
            </span>
          </div>
          {task.assignees?.length ? (
            <AssigneesStack ids={task.assignees} />
          ) : (
            <span className="max-w-[4.5rem] truncate text-[10px] text-muted-foreground">
              {t("dashboard.unassigned")}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <span className="text-[11px] font-semibold tabular-nums text-foreground/90">
            {progressPct}%
          </span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssigneesStack({ ids, compact }: { ids: string[]; compact?: boolean }) {
  const { data: users } = useUsersByIds(ids);
  const maxVisible = compact ? 3 : 4;
  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const visibleIds = ids.slice(0, maxVisible);
  const rest = Math.max(0, ids.length - maxVisible);

  if (!ids.length) return null;

  const avatarClass = compact
    ? "size-5 border border-background ring-1 ring-muted"
    : "size-6 border-2 border-background ring-1 ring-muted";

  const fallbackTextClass = compact ? "text-[8px]" : "text-[9px]";

  return (
    <div className="flex items-center -space-x-2">
      <TooltipProvider delayDuration={300}>
        {visibleIds.map((id) => {
          const user = usersById.get(id);
          const label = user ? displayUsername(user) : id;
          const initials = user ? userInitials(user) : id.slice(0, 2).toUpperCase();

          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Avatar className={`${avatarClass} cursor-default`}>
                  {user?.avatarData ? (
                    <AvatarImage src={user.avatarData} alt="" />
                  ) : null}
                  <AvatarFallback
                    className={`${fallbackTextClass} font-bold bg-muted text-muted-foreground`}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
      {rest > 0 ? (
        <div
          className={
            compact
              ? "z-10 flex size-5 items-center justify-center rounded-full border border-background bg-muted text-[7px] font-medium text-muted-foreground ring-1 ring-muted"
              : "z-10 flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px] font-medium text-muted-foreground ring-1 ring-muted"
          }
        >
          +{rest}
        </div>
      ) : null}
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((slot) => (
        <div key={slot} className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <div className="space-y-3">
            <Skeleton className="min-h-[6.25rem] w-full rounded-xl" />
            <Skeleton className="min-h-[6.25rem] w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
