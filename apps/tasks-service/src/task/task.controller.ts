import type {
  AssignTaskPayload,
  CreateCommentPayload,
  CreateTaskPayload,
  DeleteTaskPayload,
  PaginationQueryPayload,
  TaskAccessRpcPayload,
  TaskHistoryPayload,
  UpdateTaskPayload,
} from "@challenge/types";
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CommentService } from "src/comment/comment.service";
import { TaskService } from "./task.service";

@Controller("tasks")
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly commentService: CommentService,
  ) { }

  @MessagePattern("task.create")
  create(@Payload() data: CreateTaskPayload) {
    return this.taskService.create(data);
  }

  @MessagePattern("task.delete")
  delete(@Payload() data: DeleteTaskPayload) {
    return this.taskService.delete(data);
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
  getAllTaskComments(@Payload() data: TaskAccessRpcPayload) {
    return this.commentService.getByTaskId(data.taskId, data.userId, data.requesterRole);
  }

  @MessagePattern("task.history")
  getAllHistory(@Payload() data: TaskHistoryPayload) {
    return this.taskService.getTaskHistory(data);
  }

  @MessagePattern("task.find_all")
  getAll(@Payload() pagination: PaginationQueryPayload) {
    return this.taskService.getAll(pagination);
  }

  @MessagePattern("task.find_one")
  getById(@Payload() payload: TaskAccessRpcPayload) {
    return this.taskService.getById(payload);
  }
}
