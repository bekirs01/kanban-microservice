import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsIn, IsNotEmpty } from "class-validator";
import { UserRole } from "../../enums";

export class AdminUpdateRoleBodyDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  @IsIn([UserRole.ADMIN, UserRole.USER])
  @IsNotEmpty()
  role!: UserRole.ADMIN | UserRole.USER;
}

export interface AdminUpdateRoleRpcPayload {
  requesterUserId: string;
  targetUserId: string;
  role: UserRole.ADMIN | UserRole.USER;
}
