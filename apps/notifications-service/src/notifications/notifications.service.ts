import { TaskNotificationPayload } from '@challenge/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entity/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
    private readonly wsGateway: NotificationsGateway,
  ) { }

  async notifyTaskAssigned(payload: TaskNotificationPayload) {
    for (const userId of payload.recipients) {
      const notification = await this.saveNotification(
        userId,
        "Nova Atribuição",
        `Você foi atribuído à tarefa: ${payload.task.title}`
      );

      this.wsGateway.notifyUser(userId, "task:updated", {
        content: notification.content,
        title: notification.title
      });
    }
  }

  async notifyTaskUpdated(payload: TaskNotificationPayload) {
    for (const userId of payload.recipients) {
      const content = payload.action === 'STATUS_CHANGE'
        ? `A tarefa "${payload.task.title}" mudou de status para ${payload.task.status}`
        : `A tarefa "${payload.task.title}" foi atualizada.`;

      const notification = await this.saveNotification(userId, 'Atualização', content);

      this.wsGateway.notifyUser(userId, 'task:updated', {
        content: notification.content,
        title: notification.title
      });
    }
  }

  async notifyTaskCreated(payload: TaskNotificationPayload) {
    for (const userId of payload.recipients) {
      const notification = await this.saveNotification(
        userId,
        'Nova Tarefa',
        `A tarefa "${payload.task.title}" foi criada.`
      );

      this.wsGateway.notifyUser(userId, 'task:created', {
        content: notification.content,
        title: notification.title
      });
    }
  }

  async notifyNewComment(payload: TaskNotificationPayload) {
    if (!payload.comment) return;

    for (const userId of payload.recipients) {
      const notification = await this.saveNotification(
        userId,
        'Novo Comentário',
        `Em "${payload.task.title}": ${payload.comment.content.slice(0, 30)}...`
      );

      this.wsGateway.notifyUser(userId, 'comment:new', {
        content: notification.content,
        title: notification.title
      });
    }
  }

  private async saveNotification(userId: string, title: string, content: string) {
    return this.notificationRepository.save(this.notificationRepository.create({ userId, title, content }));
  }
}