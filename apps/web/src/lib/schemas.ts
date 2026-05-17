import type { TranslateFn } from "@/i18n/types";
import { UserRole } from "@challenge/types/enums";
import { z } from "zod";

export function buildLoginSchema(t: TranslateFn) {
  return z.object({
    email: z.email(t("validation.emailInvalid")),
    password: z.string().min(6, t("validation.passwordMin")),
  });
}

export function buildSignupRequestSchema(t: TranslateFn) {
  return z.object({
    username: z.string().min(3, t("validation.usernameMin")),
    email: z.string().email(t("validation.emailInvalid")),
    password: z.string().min(6, t("validation.passwordMin")),
    requestedRole: z.literal(UserRole.USER),
  });
}

export function buildCreateTaskSchema(t: TranslateFn) {
  return z.object({
    title: z.string().min(3, t("validation.titleMin")),
    description: z.string().min(10, t("validation.descriptionMin")),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    deadline: z.string().min(1, t("validation.deadlineRequired")),
    assignees: z.array(z.string()).optional(),
  });
}

export function buildUpdateTaskSchema(t: TranslateFn) {
  return buildCreateTaskSchema(t).partial();
}

export function buildCommentSchema(t: TranslateFn) {
  return z.object({
    content: z.string().max(1000, t("validation.commentTooLong")),
  });
}

export type LoginFormData = z.infer<ReturnType<typeof buildLoginSchema>>;
export type SignupRequestFormData = z.infer<
  ReturnType<typeof buildSignupRequestSchema>
>;
export type CreateTaskFormData = z.infer<
  ReturnType<typeof buildCreateTaskSchema>
>;
export type UpdateTaskFormData = z.infer<
  ReturnType<typeof buildUpdateTaskSchema>
>;
export type CommentFormData = z.infer<ReturnType<typeof buildCommentSchema>>;
