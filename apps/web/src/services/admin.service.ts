import type {
  AdminCreateUserDto,
  AdminUpdateRoleBodyDto,
  ListedPendingRegistrationDto,
  UserRole,
} from "@challenge/types";
import { api } from "./api";

export interface AdminListedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export async function listAdminUsers(): Promise<AdminListedUser[]> {
  const { data } = await api.get<AdminListedUser[]>("/api/admin/users");
  return data;
}

export async function createAdminUser(
  dto: AdminCreateUserDto,
): Promise<AdminListedUser> {
  const { data } = await api.post<AdminListedUser>("/api/admin/users", dto);
  return data;
}

export async function patchAdminUserRole(
  userId: string,
  body: AdminUpdateRoleBodyDto,
): Promise<AdminListedUser> {
  const { data } = await api.patch<AdminListedUser>(
    `/api/admin/users/${userId}/role`,
    body,
  );
  return data;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await api.delete(`/api/admin/users/${userId}`);
}

export async function listPendingRegistrationRequests(): Promise<
  ListedPendingRegistrationDto[]
> {
  const { data } = await api.get<ListedPendingRegistrationDto[]>(
    "/api/admin/registration-requests",
  );
  return data;
}

export async function approveRegistrationRequest(requestId: string): Promise<void> {
  await api.post(
    `/api/admin/registration-requests/${requestId}/approve`,
    {},
  );
}

export async function rejectRegistrationRequest(requestId: string): Promise<void> {
  await api.post(`/api/admin/registration-requests/${requestId}/reject`, {});
}
