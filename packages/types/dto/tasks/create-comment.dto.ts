import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../enums';

export class CreateCommentDto {
  @ApiPropertyOptional({
    example: 'Build failed due to migration order.',
    description:
      'Comment text (unless an image is attached). Minimum length is enforced server-side only when no image is present.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'The comment cannot exceed 1000 characters.' })
  content?: string;

  @ApiPropertyOptional({
    example: '/api/uploads/comment-images/9c2c4c4c-cc00-4123-bcde-001122334455.jpg',
    description: 'Public path of a stored attachment (set internally after upload)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string | null;
}

export interface CreateCommentPayload {
  taskId: string;
  authorId: string;
  content: string;
  imageUrl?: string | null;
  requesterRole?: UserRole;
}
