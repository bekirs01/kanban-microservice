import { ActionType } from "@challenge/types";
import type {
  KanbanBoardChangeDto,
  RegistrationPendingNotificationPayload,
  TaskNotificationPayload,
} from "@challenge/types";
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

      this.wsGateway.notifyUser(userId, "task:assigned", {
        content: notification.content,
        title: notification.title,
        actorId: payload.actorId,
        taskId: payload.task.id,
      });
    }
    this.emitBoard(payload, 'assigned');
  }

  async notifyTaskUpdated(payload: TaskNotificationPayload) {
    for (const userId of payload.recipients) {
      const content = payload.action === ActionType.STATUS_CHANGE
        ? `A tarefa "${payload.task.title}" mudou de status para ${payload.task.status}`
        : `A tarefa "${payload.task.title}" foi atualizada.`;

      const notification = await this.saveNotification(userId, 'Atualização', content);

      this.wsGateway.notifyUser(userId, 'task:updated', {
        content: notification.content,
        title: notification.title,
        actorId: payload.actorId,
        taskId: payload.task.id,
      });
    }
    const ts = payload.timestamp || new Date().toISOString();
    if (payload.action === ActionType.STATUS_CHANGE) {
      this.wsGateway.emitTaskMoved({
        actorId: payload.actorId,
        taskId: payload.task.id,
        status: payload.task.status,
        timestamp: ts,
      });
      this.emitBoard(payload, 'moved');
    } else {
      this.emitBoard(payload, 'updated');
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
        title: notification.title,
        actorId: payload.actorId,
        taskId: payload.task.id,
      });
    }
    this.emitBoard(payload, 'created');
  }

  async notifyTaskDeleted(payload: TaskNotificationPayload) {
    for (const userId of payload.recipients) {
      const notification = await this.saveNotification(
        userId,
        'Tarefa Removida',
        `A tarefa "${payload.task.title}" foi removida.`,
      );

      this.wsGateway.notifyUser(userId, 'task:deleted', {
        content: notification.content,
        title: notification.title,
        actorId: payload.actorId,
        taskId: payload.task.id,
      });
    }
    this.emitBoard(payload, 'deleted');
  }

  async notifyNewComment(payload: TaskNotificationPayload) {
    if (!payload.comment) return;

    const raw = payload.comment.content?.trim() ?? "";
    const hasImage = !!payload.comment.imageUrl;
    let snippet = "";
    if (raw.length > 0) {
      snippet = raw.length > 30 ? `${raw.slice(0, 30)}…` : raw;
    }
    if (!snippet && hasImage) {
      snippet = "[Image]";
    } else if (snippet && hasImage) {
      snippet = `${snippet} [Image]`;
    }
    if (!snippet) snippet = "…";

    for (const userId of payload.recipients) {
      const notification = await this.saveNotification(
        userId,
        'Novo Comentário',
        `Em "${payload.task.title}": ${snippet}`
      );

      this.wsGateway.notifyUser(userId, 'comment:new', {
        content: notification.content,
        title: notification.title,
        actorId: payload.actorId,
        taskId: payload.task.id,
      });
    }
    this.emitBoard(payload, 'comment');
  }

  async notifyRegistrationPending(payload: RegistrationPendingNotificationPayload) {
    const title = "Registration awaiting approval";
    const content = `${payload.applicantUsername} (${payload.applicantEmail}) requested role ${payload.requestedRole}`;
    for (const userId of payload.adminUserIds) {
      const notification = await this.saveNotification(userId, title, content);

      this.wsGateway.notifyUser(userId, "registration:pending", {
        content: notification.content,
        title: notification.title,
        registrationRequestId: payload.requestId,
        requestedRole: payload.requestedRole,
      });
    }
  }

  private emitBoard(payload: TaskNotificationPayload, reason: KanbanBoardChangeDto['reason']) {
    const timestamp = payload.timestamp || new Date().toISOString();
    this.wsGateway.emitBoardChanged({
      actorId: payload.actorId,
      reason,
      taskId: payload.task.id,
      status: payload.task.status,
      timestamp,
    });
  }

  private async saveNotification(userId: string, title: string, content: string) {
    return this.notificationRepository.save(this.notificationRepository.create({ userId, title, content }));
  }
}
