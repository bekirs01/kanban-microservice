import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../../enums";
import { IsEmail, IsEnum, IsIn, IsString, MinLength } from "class-validator";

const REQUESTABLE_REGISTRATION_ROLES = [UserRole.USER, UserRole.MANAGER] as const;

export class SubmitRegistrationRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: REQUESTABLE_REGISTRATION_ROLES })
  @IsEnum(UserRole)
  @IsIn([UserRole.USER, UserRole.MANAGER])
  requestedRole!: typeof REQUESTABLE_REGISTRATION_ROLES[number];
}

export interface SubmitRegistrationRpcPayload {
  username: string;
  email: string;
  password: string;
  requestedRole: UserRole.USER | UserRole.MANAGER;
}

export interface ListedPendingRegistrationDto {
  id: string;
  username: string;
  email: string;
  requestedRole: UserRole;
  createdAt: string;
}

export interface AdminListRegistrationsRpcPayload {
  requesterUserId: string;
}

export interface AdminRegistrationDecisionRpcPayload {
  requesterUserId: string;
  requestId: string;
}
