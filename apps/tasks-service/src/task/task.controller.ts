import type { AssignTaskPayload, CreateCommentPayload, CreateTaskPayload, PaginationQueryPayload, TaskHistoryPayload, UpdateTaskPayload } from "@challenge/types";
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CommentService } from "src/comment/comment.service";
import { TaskService } from "./task.service";

@Controller("tasks")
export class TaskController {
  constructor(private readonly taskService: TaskService, private readonly commentService: CommentService) { }

  @MessagePattern("task.create")
  create(@Payload() data: CreateTaskPayload) {
    return this.taskService.create(data)
  }

  @MessagePattern("task.delete")
  delete(@Payload() data: { taskId: string, userId: string }) {
    return this.taskService.delete(data)
  }

  @MessagePattern("task.assign_user")
  assignUser(@Payload() data: AssignTaskPayload) {
    return this.taskService.assignUser(data);
  }

  @MessagePattern("task.unassign_user")
  unassignUser(@Payload() data: AssignTaskPayload) {
    return this.taskService.unassignUser(data);
  }

  @MessagePattern("task.update")
  update(@Payload() data: UpdateTaskPayload) {
    return this.taskService.update(data);
  }

  @MessagePattern("task.comment")
  comment(@Payload() data: CreateCommentPayload) {
    return this.taskService.comment(data);
  }

  @MessagePattern("task.comment.find_all")
  getAllTaskComments(@Payload() data: { taskId: string, userId: string }) {
    return this.commentService.getByTaskId(data.taskId, data.userId);
  }

  @MessagePattern("task.history")
  getAllHistory(@Payload() data: TaskHistoryPayload & PaginationQueryPayload) {
    return this.taskService.getTaskHistory(data);
  }

  @MessagePattern("task.find_all")
  getAll(@Payload() pagination: PaginationQueryPayload) {
    return this.taskService.getAll(pagination);
  }

  @MessagePattern("task.find_one")
  getById(@Payload() taskId: string) {
    return this.taskService.getById(taskId);
  }
}
