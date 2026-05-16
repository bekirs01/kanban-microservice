import type { UserRole } from "../../enums/index.js";

export interface ArchiveTaskRpcPayload {
  taskId: string;
  userId: string;
  requesterRole?: UserRole;
}
