import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from "class-validator";
import { UserRole } from "../../enums";

export class AdminCreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  username!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}

export interface AdminCreateUserRpcPayload extends AdminCreateUserDto {
  requesterUserId: string;
}

export interface AdminListUsersRpcPayload {
  requesterUserId: string;
}

export interface AdminDeleteUserRpcPayload {
  requesterUserId: string;
  targetUserId: string;
}
