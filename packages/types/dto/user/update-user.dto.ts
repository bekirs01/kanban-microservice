import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RegisterAuthDto } from '../auth/register-auth.dto';

export class UpdateUserDto extends PartialType(RegisterAuthDto) {
  @ApiPropertyOptional({
    description: 'Hashed refresh token for session management',
    example: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
  })
  @IsOptional()
  @IsString()
  refreshTokenHash?: string;
}