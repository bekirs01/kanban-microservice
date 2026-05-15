import { TaskNotFoundRpcException, UnauthorizedRpcException } from '@challenge/exceptions';
import { ActionType, AssignTaskPayload, CreateCommentPayload, CreateTaskPayload, PaginationQueryPayload, PaginationResultDto, ResponseTaskHistoryDto, TaskHistoryPayload, TaskNotificationPayload, UpdateTaskPayload } from '@challenge/types';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentService } from 'src/comment/comment.service';
import { Comment } from 'src/comment/entity/comment.entity';
import { AuditChanges, TaskHistory } from 'src/history/entity/task-history.entity';
import { Repository } from 'typeorm';
import { DeleteResult } from 'typeorm/browser';
import { Task } from './entity/task.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task) private taskRepository: Repository<Task>,
    @InjectRepository(TaskHistory) private historyRepository: Repository<TaskHistory>,
    @Inject("NOTIFICATION_SERVICE") private readonly notificationClient: ClientProxy,
    private readonly commentService: CommentService
  ) { }

  async create(dto: CreateTaskPayload): Promise<Task> {
    return await this.taskRepository.save(dto)
  }

  async delete(data: { taskId: string, userId: string }): Promise<DeleteResult> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException;

    await this.historyRepository.save({
      action: ActionType.DELETE,
      taskId: task.id,
      changes: {
        new: {},
        old: { ...task }
      },
      changedBy: data.userId
    })

    return await this.taskRepository.delete(data.taskId);
  }

  async update(data: UpdateTaskPayload): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();

    const changes = this.computeChanges(task, data);

    if (this.hasChanges(changes)) {
      await this.saveHistory(task.id, changes, data.authorId);
    }

    Object.assign(task, data);
    const updatedTask = await this.taskRepository.save(task);

    if (this.hasChanges(changes)) {
      this.notifyUpdate(updatedTask, changes, data.authorId);
    }

    return updatedTask;
  }

  async getAll(pagination: PaginationQueryPayload): Promise<PaginationResultDto<Task[]>> {
    const { limit = 10, page = 1, userId } = pagination;

    const skip = (page - 1) * limit;

    const queryBuilder = this.taskRepository
      .createQueryBuilder("task")
      .where("task.creatorId = :userId", { userId })
      .orWhere("task.assignees ILIKE :userIdPattern", { userIdPattern: `%${userId}%` })
      .skip(skip)
      .take(limit);

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

  async getById(task_id: string): Promise<Task> {
    const query = this.taskRepository.createQueryBuilder("task")
      .leftJoinAndSelect("task.comments", "comments")
      .andWhere("task.id = :id", { id: task_id })
    const task = await query.getOne();
    if (!task) throw new TaskNotFoundRpcException();
    return task;
  }

  async assignUser(data: AssignTaskPayload): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });

    if (!task) throw new TaskNotFoundRpcException();

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
          new: { assignees: task.assignees }
        },
        changedBy: data.assignerId
      });

      const payload: TaskNotificationPayload = {
        recipients: [data.assigneeId],
        task: {
          id: savedTask.id,
          assigneeIds: savedTask.assignees,
          status: savedTask.status,
          title: savedTask.title,
          description: savedTask.description,
        },
        action: ActionType.ASSIGNED
      };

      this.notificationClient.emit("task.assigned", payload);
    }
    return task;
  }

  async unassignUser(data: AssignTaskPayload): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });

    if (!task) throw new TaskNotFoundRpcException();

    if (!task.assignees) task.assignees = [];

    if (task.assignees.includes(data.assigneeId)) {
      const oldAssignees = [...task.assignees];

      task.assignees = task.assignees.filter(a => a !== data.assigneeId);
      const savedTask = await this.taskRepository.save(task);


      await this.historyRepository.save({
        taskId: task.id,
        action: ActionType.ASSIGNED,
        changes: {
          old: { assignees: oldAssignees },
          new: { assignees: task.assignees }
        },
        changedBy: data.assignerId
      });

      const payload: TaskNotificationPayload = {
        recipients: [data.assigneeId],
        task: {
          id: savedTask.id,
          assigneeIds: savedTask.assignees,
          status: savedTask.status,
          title: savedTask.title,
          description: savedTask.description,
        },
        action: ActionType.ASSIGNED
      };

      this.notificationClient.emit("task.updated", payload);
    }

    return task;
  }


  async comment(data: CreateCommentPayload): Promise<Comment> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } })
    if (!task) throw new TaskNotFoundRpcException();

    const createdComment = await this.commentService.create(data);

    await this.historyRepository.save({
      taskId: task.id,
      action: ActionType.COMMENT,
      changes: {
        old: {},
        new: { content: data.content }
      },
      changedBy: data.authorId
    });

    let recipients: string[] = [task.creatorId];

    if (task.assignees) {
      for (const assignee of task.assignees) {
        recipients.push(assignee);
      }
    }

    recipients = Array.from(new Set(recipients)).filter(r => !!r && r !== data.authorId);

    const payload: TaskNotificationPayload = {
      recipients,
      task: {
        id: task.id,
        title: task.title,    // Define a ação baseada no que mudou

        status: task.status,
        description: task.description,
        assigneeIds: recipients,
      },
      comment: {
        authorId: data.authorId,
        content: data.content
      },
      action: ActionType.COMMENT,
    }
    this.notificationClient.emit("task.comment", payload)
    return createdComment;
  }

  async getTaskHistory(data: TaskHistoryPayload & PaginationQueryPayload): Promise<PaginationResultDto<ResponseTaskHistoryDto[]>> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();

    const isCreator = task.creatorId === data.userId;
    const isAssignee = task.assignees?.includes(data.userId) ?? false;

    if (!isCreator && !isAssignee) {
      throw new UnauthorizedRpcException("Você não tem permissão para acessar o histórico desta tarefa");
    }

    const { limit = 10, page = 1 } = data;

    const skip = (page - 1) * limit;

    const queryBuilder = this.historyRepository
      .createQueryBuilder("taskHistory")
      .where("taskHistory.taskId = :taskId", { taskId: data.taskId })
      .orderBy("taskHistory.changedAt", "DESC")
      .skip(skip)
      .take(limit);

    const [history, totalHistory] = await queryBuilder.getManyAndCount();

    const mapped: ResponseTaskHistoryDto[] = history.map((h: TaskHistory) => {
      const changes: AuditChanges = h.changes || ({ old: {}, new: {} } as AuditChanges);
      const oldObj = changes.old || {};
      const newObj = changes.new || {};

      let content = "";

      switch (h.action) {
        case ActionType.ASSIGNED: {
          const oldAssignees = Array.isArray(oldObj.assignees) ? oldObj.assignees : (oldObj.assignees ? [oldObj.assignees] : []);
          const newAssignees = Array.isArray(newObj.assignees) ? newObj.assignees : (newObj.assignees ? [newObj.assignees] : []);
          const oldSet = new Set(oldAssignees);
          const newSet = new Set(newAssignees);

          const added = newAssignees.filter(a => !oldSet.has(a));
          const removed = oldAssignees.filter(a => !newSet.has(a));
          if (added.length && !removed.length) {
            content = added.length === 1 ? `adicionou ${added[0]}` : `adicionou ${added.length}`;
          } else if (removed.length && !added.length) {
            content = removed.length === 1 ? `removeu ${removed[0]}` : `removeu ${removed.length}`;
          } else if (added.length && removed.length) {
            const parts: string[] = [];
            parts.push(added.length === 1 ? `adicionou ${added[0]}` : `adicionou ${added.length}`);
            parts.push(removed.length === 1 ? `removeu ${removed[0]}` : `removeu ${removed.length}`);
            content = parts.join('; ');
          } else {
            content = 'alterou atribuições';
          }

          break;
        }

        case ActionType.STATUS_CHANGE: {
          const STATUS_LABELS: Record<string, string> = {
            TODO: "A Fazer",
            IN_PROGRESS: "Em Progresso",
            REVIEW: "Em Revisão",
            DONE: "Concluído",
          };

          content = `mudou o status para ${STATUS_LABELS[newObj.status] ?? 'desconhecido'}`;
          break;
        }

        case ActionType.UPDATE: {
          content = 'atualizou a tarefa';
          break;
        }

        case ActionType.CREATED: {
          content = `criou a tarefa${newObj.title ? `: ${newObj.title}` : ''}`;
          break;
        }

        case ActionType.COMMENT: {
          content = 'adicionou um comentário';
          break;
        }

        default:
          content = 'alteração';
      }

      return {
        authorId: h.changedBy,
        action: h.action,
        content,
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
    const { taskId, authorId, ...fieldsToUpdate } = data;

    for (const key of Object.keys(fieldsToUpdate)) {
      const newValue = fieldsToUpdate[key];
      const oldValue = task[key];

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
      changedBy: authorId
    });
  }

  private notifyUpdate(task: Task, changes: AuditChanges, authorId: string) {
    const recipients = [
      ...(task.assignees || []),
      task.creatorId
    ].filter((userId) => userId !== authorId);

    if (recipients.length === 0) return;

    const action = (changes.new as any).status ? ActionType.STATUS_CHANGE : ActionType.UPDATE;

    const payload: TaskNotificationPayload = {
      recipients,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        description: task.description,
        assigneeIds: task.assignees || []
      },
      action
    };

    this.notificationClient.emit("task.updated", payload);
  }
}
