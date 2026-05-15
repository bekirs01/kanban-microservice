import { TaskNotFoundRpcException, UnauthorizedRpcException } from "@challenge/exceptions";
import { CreateCommentPayload } from "@challenge/types";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Task } from "src/task/entity/task.entity";
import { Repository } from "typeorm";
import { Comment } from "./entity/comment.entity";

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment) private commentRepository: Repository<Comment>,
    @InjectRepository(Task) private taskRepository: Repository<Task>,
    @Inject("NOTIFICATION_SERVICE") private readonly notificationClient: ClientProxy
  ) { }

  async create(data: CreateCommentPayload): Promise<Comment> {
    const task = await this.taskRepository.findOne({ where: { id: data.taskId } });
    if (!task) throw new TaskNotFoundRpcException();

    const savedComment = await this.commentRepository.save(data);

    return savedComment;
  }

  async getByTaskId(taskId: string, userId: string): Promise<Comment[]> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new TaskNotFoundRpcException();

    const isCreator = task.creatorId === userId;
    const isAssignee = task.assignees?.includes(userId) ?? false;

    if (!isCreator && !isAssignee) {
      throw new UnauthorizedRpcException("Você não tem permissão para acessar os comentários desta tarefa");
    }

    const comments = await this.commentRepository.find({
      where: { taskId },
      order: { createdAt: "DESC" },
    });

    return comments;
  }
}
