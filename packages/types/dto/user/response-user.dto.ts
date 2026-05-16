import { UserRole } from "../../enums";

export class ResponseUserDto {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}