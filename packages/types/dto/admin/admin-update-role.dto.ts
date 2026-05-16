import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";
import { UserRole } from "../../enums";

export class AdminUpdateRoleBodyDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;
}

export interface AdminUpdateRoleRpcPayload {
  requesterUserId: string;
  targetUserId: string;
  role: UserRole;
}
