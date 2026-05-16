export interface ResponseNotificationDto {
  title: string;
  content: string;
  actorId?: string;
  taskId?: string;
}

export interface KanbanBoardChangeDto {
  actorId: string;
  reason:
    | "created"
    | "updated"
    | "deleted"
    | "moved"
    | "assigned"
    | "comment";
  taskId?: string;
  status?: string;
  timestamp: string;
}

export interface TaskMovedSocketDto {
  actorId: string;
  taskId: string;
  status: string;
  timestamp: string;
}

export interface TaskDeletedSocketDto {
  actorId: string;
  taskId: string;
  timestamp: string;
}