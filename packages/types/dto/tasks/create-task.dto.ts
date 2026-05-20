import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority, TaskStatus, UserRole } from '../../enums';

export class TaskChecklistItemDto {
  @ApiPropertyOptional({ description: 'Stable identifier for the checklist item' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Checklist step text', example: 'Verify deployment logs' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Whether the step is marked as done', default: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class CreateTaskDto {

  @ApiProperty({ example: 'Corrigir bug no checkout', description: 'Título da tarefa' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'O erro acontece quando o usuário clica em...', description: 'Descrição detalhada' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.MEDIUM })
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ type: [String], example: ['user-id-1', 'user-id-2'], description: 'IDs dos usuários atribuídos' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignees?: string[];

  @ApiProperty({ example: '2025-12-25T23:59:59Z', description: 'Data limite ISO8601 com data e hora' })
  @IsDateString()
  deadline: Date;

  @ApiPropertyOptional({ type: [TaskChecklistItemDto], description: 'Optional execution checklist' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskChecklistItemDto)
  checklist?: TaskChecklistItemDto[];
}

export interface CreateTaskPayload extends CreateTaskDto {
  creatorId: string;
  requesterRole?: UserRole;
}