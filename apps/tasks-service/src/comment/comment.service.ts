import { ForbiddenRpcException, TaskNotFoundRpcException } from "@challenge/exceptions";
import type { CreateCommentPayload } from "@challenge/types";
import { UserRole } from "@challenge/types";
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Task } from "src/task/entity/task.entity";
import { Repository } from "typeorm";
import { Comment } from "./entity/comment.entity";

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment) private commentRepository: Repository<Comment>,
    @InjectRepository(Task) private taskRepository: Repository<Task>,
  ) { }

  private normalizeRole(role?: string): UserRole {
    if (role === UserRole.ADMIN || role === UserRole.MANAGER || role === UserRole.USER) {
      return role;
    }
    return UserRole.USER;
  }

  private isElevated(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.MANAGER;
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

  async create(data: CreateCommentPayload): Promise<Comment> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();

    const role = this.normalizeRole(data.requesterRole);
    if (task.archivedAt) {
      throw new ForbiddenRpcException();
    }
    if (!this.isElevated(role)) {
      this.assertTaskVisible(task, data.authorId, data.requesterRole);
    }

    const textContent = (data.content ?? '').trim().slice(0, 1000);
    const imageUrl = data.imageUrl?.trim() ?? null;

    if (!imageUrl && textContent.length < 3) {
      throw new RpcException({
        statusCode: 400,
        message: "INVALID_COMMENT_BODY",
      });
    }

    const savedComment = await this.commentRepository.save({
      taskId: data.taskId,
      authorId: data.authorId,
      content: textContent,
      imageUrl,
    });

    return savedComment;
  }

  async getByTaskId(taskId: string, userId: string, requesterRole?: string): Promise<Comment[]> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new TaskNotFoundRpcException();

    this.assertTaskVisible(task, userId, requesterRole);

    const comments = await this.commentRepository.find({
      where: { taskId },
      order: { createdAt: "DESC" },
    });

    return comments;
  }
}
