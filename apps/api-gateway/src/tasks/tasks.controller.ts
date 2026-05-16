import { ArchiveTaskRpcPayload, AssignTaskDto, AssignTaskPayload, CreateCommentPayload, CreateTaskDto, CreateTaskPayload, DeleteTaskPayload, PaginationQueryDto, PaginationQueryPayload, TaskAccessRpcPayload, TaskHistoryPayload, UpdateTaskDto, UpdateTaskPayload } from '@challenge/types';
import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { isBoardElevated, normalizeRequesterRole } from '../common/rbac';
import { commentImageUploadOptions, type CommentUploadLike } from '../upload/comment-image-upload';
import { storedCommentImageRelativeUrl } from '../upload/upload.paths';

function normalizeMultipartContentField(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (typeof first === "string") {
      return first;
    }
    if (Buffer.isBuffer(first)) {
      return first.toString("utf8");
    }
  }
  if (Buffer.isBuffer(raw)) {
    return raw.toString("utf8");
  }
  if (raw != null && typeof raw !== "object") {
    return String(raw);
  }
  return "";
}

@ApiTags("tasks")
@ApiBearerAuth()
@Controller("/tasks")
export class TasksController {
  constructor(@Inject("TASKS_SERVICE") private readonly tasksClient: ClientProxy) { }

  @UseGuards(AuthGuard("jwt"))
  @Post()
  @ApiOperation({ summary: 'Criar uma nova tarefa' })
  @ApiResponse({ status: 201, description: 'Tarefa criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  createTask(@Body() dto: CreateTaskDto, @Req() req: any) {
    const role = normalizeRequesterRole(req.user?.role);
    const payload: CreateTaskPayload = {
      ...dto,
      creatorId: req.user.id,
      requesterRole: role,
    };
    return this.tasksClient.send("task.create", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("/:id")
  @ApiOperation({ summary: 'Deletar uma tarefa' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)', example: 'uuid-v4' })
  @ApiResponse({ status: 204, description: 'Tarefa deletada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Tarefa não encontrada.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  deleteTask(@Param("id") taskId: string, @Req() req: any) {
    const role = normalizeRequesterRole(req.user?.role);
    const payload: DeleteTaskPayload = {
      taskId,
      userId: req.user.id,
      requesterRole: role,
    };
    return this.tasksClient.send("task.delete", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("/:id/assign")
  @ApiOperation({ summary: 'Atribuir um usuário a uma tarefa' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)', example: 'uuid-v4' })
  @ApiResponse({ status: 201, description: 'Usuário atribuído com sucesso.' })
  @ApiResponse({ status: 404, description: 'Tarefa ou Usuário não encontrados.' })
  assignUser(@Body() dto: AssignTaskDto, @Param("id") taskId: string, @Req() req: any) {
    const role = normalizeRequesterRole(req.user?.role);
    const payload: AssignTaskPayload = {
      assigneeId: dto.assigneeId,
      taskId,
      assignerId: req.user.id,
      requesterRole: role,
    };
    return this.tasksClient.send("task.assign_user", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("/:id/unassign")
  @ApiOperation({ summary: 'Remover um usuário de uma tarefa' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)', example: 'uuid-v4' })
  @ApiResponse({ status: 201, description: 'Usuário desatribuído com sucesso.' })
  @ApiResponse({ status: 404, description: 'Tarefa ou Usuário não encontrados.' })
  unassignUser(@Body() dto: AssignTaskDto, @Param("id") taskId: string, @Req() req: any) {
    const role = normalizeRequesterRole(req.user?.role);
    const payload: AssignTaskPayload = {
      assigneeId: dto.assigneeId,
      taskId,
      assignerId: req.user.id,
      requesterRole: role,
    };
    return this.tasksClient.send("task.unassign_user", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("/:id/archive")
  @ApiOperation({ summary: "Archive task (elevated only)" })
  @ApiParam({ name: "id", description: "Task ID (UUID)" })
  archiveTask(@Param("id", ParseUUIDPipe) taskId: string, @Req() req: any) {
    const role = normalizeRequesterRole(req.user?.role);
    const payload: ArchiveTaskRpcPayload = {
      taskId,
      userId: req.user.id,
      requesterRole: role,
    };
    return this.tasksClient.send("task.archive", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("/:id/unarchive")
  @ApiOperation({ summary: "Restore task from archive (elevated only)" })
  @ApiParam({ name: "id", description: "Task ID (UUID)" })
  unarchiveTask(@Param("id", ParseUUIDPipe) taskId: string, @Req() req: any) {
    const role = normalizeRequesterRole(req.user?.role);
    const payload: ArchiveTaskRpcPayload = {
      taskId,
      userId: req.user.id,
      requesterRole: role,
    };
    return this.tasksClient.send("task.unarchive", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("/:id")
  @ApiOperation({ summary: 'Atualizar uma tarefa existente' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)', example: 'uuid-v4' })
  @ApiResponse({ status: 200, description: 'Tarefa atualizada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 404, description: 'Tarefa não encontrada.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  update(@Body() dto: UpdateTaskDto, @Param("id") taskId: string, @Req() req: any) {
    const role = normalizeRequesterRole(req.user?.role);
    const payload: UpdateTaskPayload = {
      ...dto,
      taskId,
      authorId: req.user.id,
      requesterRole: role,
    };
    return this.tasksClient.send("task.update", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("/:id/comment")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("image", commentImageUploadOptions))
  @ApiOperation({ summary: 'Adicionar um comentário na tarefa' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)' })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Comment caption (minimum 3 characters when no image is attached)",
          maxLength: 1000,
        },
        image: {
          type: "string",
          format: "binary",
          description: "JPEG, PNG, GIF, or WEBP (max 5MB)",
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Comentário adicionado.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou arquivo rejeitado.' })
  comment(
    @Param("id") taskId: string,
    @UploadedFile() file: CommentUploadLike | undefined,
    @Req() req: any,
  ) {
    const role = normalizeRequesterRole(req.user?.role);
    const trimmed =
      normalizeMultipartContentField(req.body?.content)
        .trim()
        .slice(0, 1000);

    if (!file && trimmed.length < 3) {
      throw new BadRequestException({
        statusCode: 400,
        message: "COMMENT_TOO_SHORT",
      });
    }

    const payload: CreateCommentPayload = {
      taskId,
      authorId: req.user.id,
      content: trimmed,
      ...(file?.filename ? { imageUrl: storedCommentImageRelativeUrl(file.filename) } : {}),
      requesterRole: role,
    };

    return this.tasksClient.send("task.comment", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("/:id/comments")
  @ApiOperation({ summary: "Listar comentários de uma tarefa" })
  @ApiParam({ name: "id", description: "ID da tarefa (UUID)", example: "uuid-v4" })
  @ApiResponse({ status: 200, description: "Lista de comentários da tarefa retornada." })
  @ApiResponse({ status: 401, description: "Não autorizado. Usuário não é criador ou assignee da tarefa." })
  @ApiResponse({ status: 404, description: "Tarefa não encontrada." })
  getAllTaskComments(
    @Param("id", ParseUUIDPipe) taskId: string,
    @Req() request: any
  ) {
    const role = normalizeRequesterRole(request.user?.role);
    const payload: TaskAccessRpcPayload = {
      taskId,
      userId: request.user.id,
      requesterRole: role,
    };
    return this.tasksClient.send("task.comment.find_all", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get(":id/history")
  @ApiOperation({ summary: "Listar histórico de auditoria de uma tarefa" })
  @ApiParam({ name: "id", description: "ID da tarefa (UUID)", example: "uuid-v4" })
  @ApiResponse({ status: 200, description: "Histórico da tarefa retornado." })
  @ApiResponse({ status: 401, description: "Não autorizado. Usuário não é criador ou assignee da tarefa." })
  @ApiResponse({ status: 404, description: "Tarefa não encontrada." })
  getTaskHistory(
    @Param("id", ParseUUIDPipe) taskId: string,
    @Query() pagination: PaginationQueryDto,
    @Req() request: any
  ) {
    const role = normalizeRequesterRole(request.user?.role);
    const payload: TaskHistoryPayload = {
      ...pagination,
      userId: request.user.id,
      requesterRole: role,
      taskId,
    };
    return this.tasksClient.send("task.history", payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get()
  @ApiOperation({ summary: 'Listar tarefas com paginação' })
  @ApiResponse({ status: 200, description: 'Lista de tarefas retornada.' })
  getAll(@Query() pagination: PaginationQueryDto, @Req() request: any) {
    const role = normalizeRequesterRole(request.user?.role);
    const elevated = isBoardElevated(role);
    const payload: PaginationQueryPayload = {
      ...pagination,
      userId: request.user.id,
      requesterRole: role,
      sharedBoard: pagination.sharedBoard === true && elevated,
      archived: pagination.archived === true && elevated ? true : undefined,
    };
    return this.tasksClient.send('task.find_all', payload);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get(":id")
  @ApiOperation({ summary: 'Buscar tarefa por ID' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)' })
  @ApiResponse({ status: 200, description: 'Tarefa encontrada.' })
  @ApiResponse({ status: 404, description: 'Tarefa não encontrada.' })
  getById(@Param("id", ParseUUIDPipe) taskId: string, @Req() req: any) {
    const role = normalizeRequesterRole(req.user?.role);
    const payload: TaskAccessRpcPayload = {
      taskId,
      userId: req.user.id,
      requesterRole: role,
    };
    return this.tasksClient.send("task.find_one", payload);
  }
}
