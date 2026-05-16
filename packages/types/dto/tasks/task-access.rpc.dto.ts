import { UserRole } from "../../enums";

export interface TaskAccessRpcPayload {
  taskId: string;
  userId: string;
  requesterRole?: UserRole;
}
