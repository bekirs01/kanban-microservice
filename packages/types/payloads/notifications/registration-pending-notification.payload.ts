import { UserRole } from "../../enums";

export interface RegistrationPendingNotificationPayload {
  adminUserIds: string[];
  applicantUsername: string;
  applicantEmail: string;
  requestedRole: UserRole.USER | UserRole.MANAGER;
  requestId: string;
}
