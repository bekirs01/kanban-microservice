import type {
  AssignTaskDto,
  CreateCommentDto,
  CreateTaskDto,
  PaginationQueryDto,
  PaginationResultDto,
  ResponseTaskDto,
  UpdateTaskDto,
} from "@challenge/types";
import { api } from './api';

export const tasksService = {
  async createTask(data: CreateTaskDto): Promise<ResponseTaskDto> {
    const response = await api.post<ResponseTaskDto>('/api/tasks', data);
    return response.data;
  },

  async getTasks(params?: PaginationQueryDto): Promise<PaginationResultDto<ResponseTaskDto[]>> {
    const response = await api.get<PaginationResultDto<ResponseTaskDto[]>>('/api/tasks', { params });
    return response.data;
  },

  async getTaskById(id: string): Promise<ResponseTaskDto> {
    const response = await api.get<ResponseTaskDto>(`/api/tasks/${id}`);
    return response.data;
  },

  async updateTask(id: string, data: UpdateTaskDto): Promise<ResponseTaskDto> {
    const response = await api.patch<ResponseTaskDto>(`/api/tasks/${id}`, data);
    return response.data;
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/api/tasks/${id}`);
  },

  async assignUser(id: string, data: AssignTaskDto): Promise<ResponseTaskDto> {
    const response = await api.post<ResponseTaskDto>(`/api/tasks/${id}/assign`, data);
    return response.data;
  },

  async unassignUser(id: string, data: AssignTaskDto): Promise<ResponseTaskDto> {
    const response = await api.post<ResponseTaskDto>(`/api/tasks/${id}/unassign`, data);
    return response.data;
  },

  async addComment(id: string, data: CreateCommentDto): Promise<Comment> {
    const response = await api.post<Comment>(`/api/tasks/${id}/comment`, data);
    return response.data;
  },

  async getCommentsByTaskId(taskId: string): Promise<any[]> {
    const response = await api.get<any[]>(`/api/tasks/${taskId}/comments`);
    return response.data;
  },

  async getTaskHistory(taskId: string, params?: PaginationQueryDto): Promise<PaginationResultDto<any[]>> {
    const response = await api.get<PaginationResultDto<any[]>>(`/api/tasks/${taskId}/history`, { params });
    return response.data;
  },
};
