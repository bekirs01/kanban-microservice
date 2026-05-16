import { ActionType } from "../../enums/index.js";

export interface TaskNotificationPayload {
  actorId: string;
  creatorId?: string;
  timestamp?: string;
  recipients: string[];
  task: {
    id: string;
    title: string;
    description?: string;
    status: string;
    assigneeIds: string[];
    creatorId?: string;
    priority?: string;
    deadline?: string;
  };
  comment?: {
    content: string;
    authorId: string;
    imageUrl?: string | null;
  };
  action?: ActionType;
}