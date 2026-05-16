import { UserRole } from "../../enums";

export interface DeleteTaskPayload {
  taskId: string;
  userId: string;
  requesterRole?: UserRole;
}
