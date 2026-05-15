import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterAuthDto {
  @ApiProperty({ example: 'thiago_dev' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'teste@test.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export interface RegisterAuthPayload extends RegisterAuthDto { };