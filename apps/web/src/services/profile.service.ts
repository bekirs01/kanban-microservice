import type { PatchWorkerProfileDto, ResponseUserDto } from "@challenge/types";
import { api } from "./api";

export async function fetchMyProfile(): Promise<ResponseUserDto> {
  const { data } = await api.get<ResponseUserDto>("/api/profile");
  return data;
}

export async function patchMyProfile(
  body: PatchWorkerProfileDto,
): Promise<ResponseUserDto> {
  const { data } = await api.patch<ResponseUserDto>("/api/profile", body);
  return data;
}

export async function fetchWorkersDirectory(): Promise<ResponseUserDto[]> {
  const { data } = await api.get<ResponseUserDto[]>("/api/workers");
  return data;
}

export async function fetchWorkerById(id: string): Promise<ResponseUserDto> {
  const { data } = await api.get<ResponseUserDto>(`/api/workers/${id}`);
  return data;
}

export async function patchWorkerAsAdmin(
  id: string,
  body: PatchWorkerProfileDto,
): Promise<ResponseUserDto> {
  const { data } = await api.patch<ResponseUserDto>(`/api/workers/${id}`, body);
  return data;
}
