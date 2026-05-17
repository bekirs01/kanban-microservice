import { ApiPropertyOptional } from "@nestjs/swagger";
import { WorkerSpecialization } from "../../enums";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class PatchWorkerProfileDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string | null;

  @ApiPropertyOptional({ enum: WorkerSpecialization })
  @IsOptional()
  @IsEnum(WorkerSpecialization)
  specialization?: WorkerSpecialization | null;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(48)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  skills?: string[] | null;

  @ApiPropertyOptional({
    description: "Optional JPEG/PNG avatar as small data URL; max encoded length enforced server-side",
  })
  @IsOptional()
  @IsString()
  @MaxLength(131072)
  avatarData?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clearAvatar?: boolean;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  telegramContact?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  githubUrl?: string | null;
}

export interface PatchWorkerProfileRpcPayload {
  requesterUserId: string;
  targetUserId?: string;
  body: PatchWorkerProfileDto;
}

export interface GetWorkerProfileRpcPayload {
  requesterUserId: string;
  targetUserId: string;
}

export interface ListWorkersDirectoryRpcPayload {
  requesterUserId: string;
}
