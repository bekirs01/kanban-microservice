import { TaskPriority, TaskStatus } from "../../enums/index.js";

export interface TaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export class ResponseTaskDto {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignees: string[];
  deadline: Date;
  creatorId: string;
  createdAt: Date;
  archivedAt?: Date | string | null;
  checklist?: TaskChecklistItem[];
}