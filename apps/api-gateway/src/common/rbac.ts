import { UserRole } from '@challenge/types';

export function normalizeRequesterRole(role?: string): UserRole {
  if (role === UserRole.ADMIN || role === UserRole.MANAGER || role === UserRole.USER) {
    return role;
  }
  return UserRole.USER;
}

export function isBoardElevated(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.MANAGER;
}
