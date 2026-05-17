import { ForbiddenRpcException, TaskNotFoundRpcException } from '@challenge/exceptions';
import {
  ActionType,
  ArchiveTaskRpcPayload,
  AssignTaskPayload,
  CreateCommentPayload,
  CreateTaskPayload,
  DeleteTaskPayload,
  PaginationQueryPayload,
  PaginationResultDto,
  ResponseTaskHistoryDto,
  TaskAccessRpcPayload,
  TaskHistoryPayload,
  TaskNotificationPayload,
  UpdateTaskPayload,
  UserRole,
  TaskStatus,
} from '@challenge/types';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentService } from 'src/comment/comment.service';
import { Comment } from 'src/comment/entity/comment.entity';
import { AuditChanges, TaskHistory } from 'src/history/entity/task-history.entity';
import { Brackets, Repository } from 'typeorm';
import { DeleteResult } from 'typeorm/browser';
import { Task } from './entity/task.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task) private taskRepository: Repository<Task>,
    @InjectRepository(TaskHistory) private historyRepository: Repository<TaskHistory>,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly commentService: CommentService,
  ) { }

  private buildTaskNotifyShape(task: Task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      assigneeIds: task.assignees || [],
      creatorId: task.creatorId,
      priority: task.priority,
      deadline: task.deadline instanceof Date ? task.deadline.toISOString() : String(task.deadline),
    };
  }

  private normalizeRole(role?: string): UserRole {
    if (role === UserRole.ADMIN || role === UserRole.USER) {
      return role;
    }
    return UserRole.USER;
  }

  private isElevated(role: UserRole): boolean {
    return role === UserRole.ADMIN;
  }

  private canParticipate(task: Task, userId: string): boolean {
    return task.creatorId === userId || (task.assignees || []).includes(userId);
  }

  private assertTaskVisible(task: Task, userId: string, roleHint?: string): void {
    const role = this.normalizeRole(roleHint);
    if (task.archivedAt && !this.isElevated(role)) {
      throw new ForbiddenRpcException();
    }
    if (this.isElevated(role)) return;
    if (!this.canParticipate(task, userId)) {
      throw new ForbiddenRpcException();
    }
  }

  async create(dto: CreateTaskPayload): Promise<Task> {
    if (this.normalizeRole(dto.requesterRole) === UserRole.USER) {
      throw new ForbiddenRpcException();
    }

    const { requesterRole, ...toSave } = dto;
    void requesterRole;

    const saved = await this.taskRepository.save(toSave as Task);
    const recipientSet = new Set((saved.assignees || []).filter(Boolean));
    recipientSet.delete(saved.creatorId);
    const recipients = [...recipientSet];
    const snapshot = this.buildTaskNotifyShape(saved);
    const payload: TaskNotificationPayload = {
      actorId: saved.creatorId,
      creatorId: saved.creatorId,
      timestamp: new Date().toISOString(),
      recipients,
      task: snapshot,
      action: ActionType.CREATED,
    };
    this.notificationClient.emit('task.created', payload);
    return saved;
  }

  async delete(data: DeleteTaskPayload): Promise<DeleteResult> {
    if (this.normalizeRole(data.requesterRole) === UserRole.USER) {
      throw new ForbiddenRpcException();
    }

    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();
    const recipientSet = new Set([task.creatorId, ...(task.assignees || [])].filter(Boolean));
    recipientSet.delete(data.userId);
    const recipients = [...recipientSet];
    const snapshot = this.buildTaskNotifyShape(task);
    const notifyPayload: TaskNotificationPayload = {
      actorId: data.userId,
      creatorId: task.creatorId,
      timestamp: new Date().toISOString(),
      recipients,
      task: snapshot,
      action: ActionType.DELETE,
    };
    this.notificationClient.emit('task.deleted', notifyPayload);

    await this.historyRepository.save({
      action: ActionType.DELETE,
      taskId: task.id,
      changes: {
        new: {},
        old: { ...task },
      },
      changedBy: data.userId,
    });

    return await this.taskRepository.delete(data.taskId);
  }

  async update(data: UpdateTaskPayload): Promise<Task> {
    const role = this.normalizeRole(data.requesterRole);
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();

    if (task.archivedAt) {
      throw new ForbiddenRpcException();
    }

    if (role === UserRole.USER) {
      this.assertTaskVisible(task, data.authorId, data.requesterRole);
      if (!(task.assignees || []).includes(data.authorId)) {
        throw new ForbiddenRpcException();
      }

      const { taskId: _tid, authorId: _aid, requesterRole: _rr, ...incoming } = data;
      void _tid;
      void _aid;
      void _rr;
      const keys = Object.keys(incoming).filter((k) => (incoming as Record<string, unknown>)[k] !== undefined);
      if (keys.some((k) => k !== 'status')) {
        throw new ForbiddenRpcException();
      }
    }

    const { taskId: __tid, authorId: __aid, requesterRole: __rr, ...fieldsToMerge } = data;
    void __tid;
    void __aid;
    void __rr;

    const patch: Partial<Task> =
      role === UserRole.USER
        ? { status: data.status as Task['status'] }
        : ({ ...fieldsToMerge } as Partial<Task>);

    const synthetic: UpdateTaskPayload = {
      taskId: data.taskId,
      authorId: data.authorId,
      ...(patch as Omit<UpdateTaskPayload, 'taskId' | 'authorId' | 'requesterRole'>),
      requesterRole: data.requesterRole,
    };

    const changes = this.computeChanges(task, synthetic);

    if (this.hasChanges(changes)) {
      await this.saveHistory(task.id, changes, data.authorId);
    }

    Object.assign(task, patch);
    const updatedTask = await this.taskRepository.save(task);

    if (this.hasChanges(changes)) {
      this.notifyUpdate(updatedTask, changes, data.authorId);
    }

    return updatedTask;
  }

  async getAll(pagination: PaginationQueryPayload): Promise<PaginationResultDto<Task[]>> {
    const { limit = 10, page = 1, userId, sharedBoard } = pagination;
    const role = this.normalizeRole(pagination.requesterRole);
    const effectiveSharedBoard = sharedBoard === true && this.isElevated(role);
    const wantArchived =
      pagination.archived === true && this.isElevated(role);

    const skip = (page - 1) * limit;

    const queryBuilder = this.taskRepository.createQueryBuilder('task');

    if (wantArchived) {
      queryBuilder.where('task.archivedAt IS NOT NULL');
    } else {
      queryBuilder.where('task.archivedAt IS NULL');
    }

    if (!effectiveSharedBoard) {
      queryBuilder.andWhere(
        new Brackets((b) => {
          b.where('task.creatorId = :userId', { userId }).orWhere(
            'task.assignees ILIKE :userIdPattern',
            { userIdPattern: `%${userId}%` },
          );
        }),
      );
    }

    queryBuilder.skip(skip).take(limit);

    const [tasks, totalTasks] = await queryBuilder.getManyAndCount();

    return {
      items: tasks,
      data: {
        totalItems: totalTasks,
        itemCount: tasks.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalTasks / limit),
        currentPage: page,
      },
    };
  }

  async getById(payload: TaskAccessRpcPayload): Promise<Task> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.comments', 'comments')
      .andWhere('task.id = :id', { id: payload.taskId });

    const task = await query.getOne();
    if (!task) throw new TaskNotFoundRpcException();

    this.assertTaskVisible(task, payload.userId, payload.requesterRole);

    return task;
  }

  async assignUser(data: AssignTaskPayload): Promise<Task> {
    if (this.normalizeRole(data.requesterRole) === UserRole.USER) {
      throw new ForbiddenRpcException();
    }

    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });

    if (!task) throw new TaskNotFoundRpcException();

    if (task.archivedAt) {
      throw new ForbiddenRpcException();
    }

    if (!task.assignees) task.assignees = [];

    if (!task.assignees.includes(data.assigneeId)) {
      const oldAssignees = [...task.assignees];

      task.assignees.push(data.assigneeId);
      const savedTask = await this.taskRepository.save(task);

      await this.historyRepository.save({
        taskId: task.id,
        action: ActionType.ASSIGNED,
        changes: {
          old: { assignees: oldAssignees },
          new: { assignees: task.assignees },
        },
        changedBy: data.assignerId,
      });

      const payloadNotify: TaskNotificationPayload = {
        actorId: data.assignerId,
        creatorId: savedTask.creatorId,
        timestamp: new Date().toISOString(),
        recipients: [data.assigneeId],
        task: {
          ...this.buildTaskNotifyShape(savedTask),
        },
        action: ActionType.ASSIGNED,
      };

      this.notificationClient.emit('task.assigned', payloadNotify);
    }
    return task;
  }

  async unassignUser(data: AssignTaskPayload): Promise<Task> {
    if (this.normalizeRole(data.requesterRole) === UserRole.USER) {
      throw new ForbiddenRpcException();
    }

    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });

    if (!task) throw new TaskNotFoundRpcException();

    if (task.archivedAt) {
      throw new ForbiddenRpcException();
    }

    if (!task.assignees) task.assignees = [];

    if (task.assignees.includes(data.assigneeId)) {
      const oldAssignees = [...task.assignees];

      task.assignees = task.assignees.filter((a) => a !== data.assigneeId);
      const savedTask = await this.taskRepository.save(task);

      await this.historyRepository.save({
        taskId: task.id,
        action: ActionType.ASSIGNED,
        changes: {
          old: { assignees: oldAssignees },
          new: { assignees: task.assignees },
        },
        changedBy: data.assignerId,
      });

      const payloadNotify: TaskNotificationPayload = {
        actorId: data.assignerId,
        creatorId: savedTask.creatorId,
        timestamp: new Date().toISOString(),
        recipients: [data.assigneeId],
        task: {
          ...this.buildTaskNotifyShape(savedTask),
        },
        action: ActionType.ASSIGNED,
      };

      this.notificationClient.emit('task.updated', payloadNotify);
    }

    return task;
  }

  async comment(data: CreateCommentPayload): Promise<Comment> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();

    if (task.archivedAt) {
      throw new ForbiddenRpcException();
    }

    const createdComment = await this.commentService.create(data);

    await this.historyRepository.save({
      taskId: task.id,
      action: ActionType.COMMENT,
      changes: {
        old: {},
        new: {
          content: createdComment.content,
          ...(createdComment.imageUrl ? { imageUrl: createdComment.imageUrl } : {}),
        },
      },
      changedBy: data.authorId,
    });

    let recipients: string[] = [task.creatorId];

    if (task.assignees) {
      for (const assignee of task.assignees) {
        recipients.push(assignee);
      }
    }

    recipients = Array.from(new Set(recipients)).filter((r) => !!r && r !== data.authorId);

    const notifyPayload: TaskNotificationPayload = {
      actorId: data.authorId,
      creatorId: task.creatorId,
      timestamp: new Date().toISOString(),
      recipients,
      task: this.buildTaskNotifyShape(task),
      comment: {
        authorId: data.authorId,
        content: createdComment.content,
        ...(createdComment.imageUrl ? { imageUrl: createdComment.imageUrl } : {}),
      },
      action: ActionType.COMMENT,
    };
    this.notificationClient.emit('task.comment', notifyPayload);

    return createdComment;
  }

  async archiveTask(data: ArchiveTaskRpcPayload): Promise<Task> {
    const role = this.normalizeRole(data.requesterRole);
    if (!this.isElevated(role)) {
      throw new ForbiddenRpcException();
    }

    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();
    if (task.archivedAt) {
      return task;
    }
    if (task.status !== TaskStatus.REVIEW && task.status !== TaskStatus.DONE) {
      throw new RpcException({
        statusCode: 400,
        message: "TASK_ARCHIVE_INVALID_STATUS",
      });
    }

    task.archivedAt = new Date();
    const saved = await this.taskRepository.save(task);

    await this.historyRepository.save({
      taskId: task.id,
      action: ActionType.UPDATE,
      changes: {
        old: { archivedAt: null },
        new: { archivedAt: saved.archivedAt },
      },
      changedBy: data.userId,
    });

    const ch: AuditChanges = {
      old: { archivedAt: null },
      new: { archivedAt: saved.archivedAt },
    };
    this.notifyUpdate(saved, ch, data.userId);

    return saved;
  }

  async unarchiveTask(data: ArchiveTaskRpcPayload): Promise<Task> {
    const role = this.normalizeRole(data.requesterRole);
    if (!this.isElevated(role)) {
      throw new ForbiddenRpcException();
    }

    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();
    if (!task.archivedAt) {
      throw new RpcException({
        statusCode: 400,
        message: "TASK_NOT_ARCHIVED",
      });
    }

    const prevArchived = task.archivedAt;
    task.archivedAt = null;
    const saved = await this.taskRepository.save(task);

    await this.historyRepository.save({
      taskId: task.id,
      action: ActionType.UPDATE,
      changes: {
        old: { archivedAt: prevArchived },
        new: { archivedAt: null },
      },
      changedBy: data.userId,
    });

    const ch: AuditChanges = {
      old: { archivedAt: prevArchived },
      new: { archivedAt: null },
    };
    this.notifyUpdate(saved, ch, data.userId);

    return saved;
  }

  async getTaskHistory(data: TaskHistoryPayload): Promise<PaginationResultDto<ResponseTaskHistoryDto[]>> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();

    this.assertTaskVisible(task, data.userId, data.requesterRole);

    const { limit = 10, page = 1 } = data;

    const skip = (page - 1) * limit;

    const queryBuilder = this.historyRepository
      .createQueryBuilder('taskHistory')
      .where('taskHistory.taskId = :taskId', { taskId: data.taskId })
      .orderBy('taskHistory.changedAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [history, totalHistory] = await queryBuilder.getManyAndCount();

    const mapped: ResponseTaskHistoryDto[] = history.map((h: TaskHistory) => {
      return {
        authorId: h.changedBy,
        action: h.action,
        content: '',
        changedAt: h.changedAt.toISOString(),
        rawChanges: h.changes,
      } as ResponseTaskHistoryDto;
    });

    return {
      items: mapped,
      data: {
        totalItems: totalHistory,
        itemCount: mapped.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalHistory / limit),
        currentPage: page,
      },
    };
  }

  private computeChanges(task: Task, data: UpdateTaskPayload): AuditChanges {
    const changes: AuditChanges = { old: {}, new: {} };
    const { taskId, authorId, requesterRole, ...fieldsToUpdate } = data;
    void taskId;
    void authorId;
    void requesterRole;

    for (const key of Object.keys(fieldsToUpdate)) {
      const newValue = fieldsToUpdate[key];
      const oldValue = (task as unknown as Record<string, unknown>)[key];

      if (newValue !== undefined && newValue !== oldValue) {
        changes.old[key] = oldValue;
        changes.new[key] = newValue;
      }
    }
    return changes;
  }

  private hasChanges(changes: AuditChanges): boolean {
    return Object.keys(changes.new).length > 0;
  }

  private async saveHistory(taskId: string, changes: AuditChanges, authorId: string) {
    const changedKeys = Object.keys(changes.new);
    const onlyStatusChanged = changedKeys.length === 1 && changedKeys[0] === 'status';

    const action = onlyStatusChanged ? ActionType.STATUS_CHANGE : ActionType.UPDATE;

    await this.historyRepository.save({
      taskId,
      action,
      changes,
      changedBy: authorId,
    });
  }

  private notifyUpdate(task: Task, changes: AuditChanges, authorId: string) {
    const recipients = [...(task.assignees || []), task.creatorId].filter(
      (rid) => rid !== authorId,
    );

    const action = (changes.new as { status?: unknown }).status ? ActionType.STATUS_CHANGE : ActionType.UPDATE;

    const notifyPayload: TaskNotificationPayload = {
      actorId: authorId,
      creatorId: task.creatorId,
      timestamp: new Date().toISOString(),
      recipients,
      task: this.buildTaskNotifyShape(task),
      action,
    };

    this.notificationClient.emit('task.updated', notifyPayload);
  }
}
