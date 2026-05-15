import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'A migration falhou porque faltou rodar o build.',
    description: 'Conteúdo do comentário da tarefa'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'O comentário precisa ter pelo menos 3 caracteres.' })
  @MaxLength(1000, { message: 'O comentário não pode ter mais de 1000 caracteres.' })
  content: string;
}

export interface CreateCommentPayload extends CreateCommentDto {
  taskId: string,
  authorId: string
}