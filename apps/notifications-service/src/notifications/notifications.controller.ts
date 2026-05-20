import type {
  RegistrationPendingNotificationPayload,
  TaskNotificationPayload,
} from "@challenge/types";
import { Controller } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { NotificationsService } from "./notifications.service";
import { DeadlineReminderService } from "../telegram/deadline-reminder.service";

@Controller()
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly deadlineReminderService: DeadlineReminderService,
  ) {}

  @EventPattern("task.assigned")
  async handleTaskAssigned(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyTaskAssigned(data);
  }

  @EventPattern("task.created")
  async handleTaskCreated(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyTaskCreated(data);
    void this.deadlineReminderService.processTaskById(data.task.id);
  }

  @EventPattern("task.updated")
  async handleTaskUpdate(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyTaskUpdated(data);
    void this.deadlineReminderService.processTaskById(data.task.id);
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

  @EventPattern("user.profile.updated")
  async handleProfileUpdated(@Payload() data: { userId: string }) {
    await this.service.notifyProfileBroadcast(data);
  }

}
