import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class AssignTaskDto {
  @ApiProperty({ example: 'uuid-do-usuario', description: 'ID do usuário a ser atribuído' })
  @IsNotEmpty()
  @IsUUID()
  assigneeId: string;
}

export interface AssignTaskPayload extends AssignTaskDto {
  taskId: string,
  assignerId: string
}