import { AssignTaskDto, AssignTaskPayload, CreateCommentDto, CreateCommentPayload, CreateTaskDto, CreateTaskPayload, DeleteTaskPayload, PaginationQueryDto, PaginationQueryPayload, TaskAccessRpcPayload, TaskHistoryPayload, UpdateTaskDto, UpdateTaskPayload } from '@challenge/types';
import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { isBoardElevated, normalizeRequesterRole } from '../common/rbac';

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
  @ApiOperation({ summary: 'Adicionar um comentário na tarefa' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)' })
  @ApiResponse({ status: 201, description: 'Comentário adicionado.' })
  comment(@Body() dto: CreateCommentDto, @Param("id") taskId: string, @Req() req: any) {
    const role = normalizeRequesterRole(req.user?.role);
    const payload: CreateCommentPayload = {
      taskId,
      authorId: req.user.id,
      content: dto.content,
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
