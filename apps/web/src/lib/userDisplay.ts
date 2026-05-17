import type { ResponseUserDto } from "@challenge/types";

export function displayUsername(
  user: Pick<ResponseUserDto, "displayName" | "username">,
): string {
  const trimmed = user.displayName?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;
  return user.username;
}

export function userInitials(user: Pick<ResponseUserDto, "displayName" | "username">): string {
  const label = displayUsername(user).trim();
  if (!label.length) return "??";
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase().slice(0, 2);
  }
  return label.slice(0, 2).toUpperCase();
}
