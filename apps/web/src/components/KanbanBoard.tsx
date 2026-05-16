import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/i18n/useTranslation";
import { canDragTaskOnBoard } from "@/lib/rbac";
import { useUpdateTask } from "@/hooks/useTasks";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { cn } from "@/lib/utils";
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
}

export function KanbanBoard({
  tasks,
  isLoading,
  onTaskClick,
  viewerId,
  viewerRole,
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 h-full items-start">
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
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-1">
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
          "flex-1 bg-muted/30 rounded-xl p-2 border border-transparent transition-colors min-h-[150px]",
          isOver && "bg-muted/60 border-primary/10 ring-2 ring-primary/5",
        )}
      >
        <div className="flex flex-col gap-3">
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
        className="opacity-0 h-[120px] rounded-lg bg-muted border-2 border-dashed"
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

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all duration-200 border-border/50 group bg-card",
        isDraggable &&
          !isOverlay &&
          "cursor-grab hover:shadow-md transition-all duration-200",
        !isDraggable &&
          !isOverlay &&
          "cursor-default hover:shadow-none",
        isOverlay &&
          "rotate-2 shadow-xl cursor-grabbing ring-1 ring-primary/20 scale-105 z-50",
      )}
    >
      <CardHeader className="pb-3 space-y-2.5">
        <div className="flex justify-between items-start">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-medium border px-2 py-0.5 rounded-md",
              PRIORITY_STYLES[task.priority],
            )}
          >
            {t(priorityLabelKey(task.priority))}
          </Badge>
        </div>

        <h4 className="text-sm font-semibold leading-snug text-foreground/90 group-hover:text-primary transition-colors">
          {task.title}
        </h4>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {task.description || t("task.noDescriptionFallback")}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-2">
          <div className="flex items-center text-xs text-muted-foreground/80 gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {task.deadline
                ? format(new Date(task.deadline), "dd MMM yy", {
                    locale: dateFnsLocale,
                  })
                : "--"}
            </span>
          </div>

          <AssigneesStack ids={task.assignees || []} />
        </div>
      </CardContent>
    </Card>
  );
}

function AssigneesStack({ ids }: { ids: string[] }) {
  const { data: users } = useUsersByIds(ids);
  const display = users?.slice(0, 3) || [];
  const rest = ids.length - 3;

  if (!ids.length) return null;

  return (
    <div className="flex items-center -space-x-2">
      <TooltipProvider delayDuration={300}>
        {display.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar className="w-6 h-6 border-2 border-background ring-1 ring-muted cursor-default">
                <AvatarFallback className="text-[9px] font-bold bg-muted text-muted-foreground">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{user.username}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
      {rest > 0 ? (
        <div className="w-6 h-6 rounded-full bg-muted border-2 border-background ring-1 ring-muted flex items-center justify-center text-[8px] font-medium text-muted-foreground z-10">
          +{rest}
        </div>
      ) : null}
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((slot) => (
        <div key={slot} className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
