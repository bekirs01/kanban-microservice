import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { UserRole } from '../../enums';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === true || value === 'true',
  )
  @IsBoolean()
  sharedBoard?: boolean;
}

export interface PaginationQueryPayload extends PaginationQueryDto {
  userId: string;
  requesterRole?: UserRole;
}