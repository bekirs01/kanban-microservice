import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../enums';

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

  @ApiProperty({ example: '2025-12-25T23:59:59Z', description: 'Data limite ISO8601' })
  @IsDateString()
  deadline: Date;
}

export interface CreateTaskPayload extends CreateTaskDto {
  creatorId: string
}