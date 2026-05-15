import type { TaskNotificationPayload } from '@challenge/types';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) { }

  @EventPattern('task.assigned')
  async handleTaskAssigned(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyTaskAssigned(data);
  }

  @EventPattern('task.updated')
  async handleTaskUpdate(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyTaskUpdated(data);
  }

  @EventPattern('task.comment')
  async handleNewComment(@Payload() data: TaskNotificationPayload) {
    await this.service.notifyNewComment(data);
  }
}