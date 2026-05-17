import type { ResponseTaskDto, ResponseUserDto } from "@challenge/types";

type Role = ResponseUserDto["role"];

export function canDragTaskOnBoard(
  role: Role | undefined,
  userId: string | undefined,
  task: ResponseTaskDto,
): boolean {
  const r = role ?? "USER";
  if (!userId) return false;
  if (r === "USER") {
    return (task.assignees ?? []).includes(userId);
  }
  return r === "ADMIN";
}

export function canManageAssignments(role: Role | undefined): boolean {
  const r = role ?? "USER";
  return r === "ADMIN";
}

export function isAdminRole(role: Role | undefined): boolean {
  return (role ?? "USER") === "ADMIN";
}

export function sharedBoardQueryFlag(role: Role | undefined): boolean {
  return canManageAssignments(role);
}

export function seesOnlyAssignedTasks(role: Role | undefined): boolean {
  return (role ?? "USER") === "USER";
}
