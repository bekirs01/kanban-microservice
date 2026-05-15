import { ActionType } from "../../enums/index.js";

export interface TaskNotificationPayload {
  recipients: string[];
  task: {
    id: string;
    title: string;
    description?: string;
    status: string;
    assigneeIds: string[];
  };
  comment?: {
    content: string;
    authorId: string;
  };
  action?: ActionType;
}