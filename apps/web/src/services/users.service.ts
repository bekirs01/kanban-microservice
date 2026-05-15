import type { ResponseUserDto } from '@challenge/types';
import { api } from './api';

export async function getUsersByIds(ids: string[]): Promise<ResponseUserDto[]> {
  if (!ids?.length) return [];
  const params = new URLSearchParams({ ids: ids.join(',') });
  const { data } = await api.get<ResponseUserDto[]>(`/api/users`, { params });
  return data;
}

export async function getAllUsers(): Promise<ResponseUserDto[]> {
  const { data } = await api.get<ResponseUserDto[]>(`/api/users`);
  return data;
}
