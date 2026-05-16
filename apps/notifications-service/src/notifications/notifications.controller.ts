import type {
  RegistrationPendingNotificationPayload,
  TaskNotificationPayload,
} from "@challenge/types";
import { Controller } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { NotificationsService } from "./notifications.service";

@Controller()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @EventPattern("task.assigned")
  async handleTaskAssigned(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyTaskAssigned(data);
  }

  @EventPattern("task.created")
  async handleTaskCreated(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyTaskCreated(data);
  }

  @EventPattern("task.updated")
  async handleTaskUpdate(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyTaskUpdated(data);
  }

  @EventPattern("task.deleted")
  async handleTaskDeleted(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyTaskDeleted(data);
  }

  @EventPattern("task.comment")
  async handleNewComment(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyNewComment(data);
  }

  @EventPattern("registration.pending")
  async registrationPending(@Payload() data: RegistrationPendingNotificationPayload) {
    await this.service.notifyRegistrationPending(data);
  }
}
