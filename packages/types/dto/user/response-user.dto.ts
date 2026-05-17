import type { WorkerSpecialization } from "../../enums";
import { UserRole } from "../../enums";

export class ResponseUserDto {
  id!: string;
  username!: string;
  email!: string;
  role!: UserRole;
  displayName!: string | null;
  specialization!: WorkerSpecialization | null;
  bio!: string | null;
  skills!: string[] | null;
  avatarData!: string | null;
  telegramContact!: string | null;
  githubUrl!: string | null;
  createdAt!: string;
  updatedAt!: string;
}