import type { ResponseUserDto } from "../user/response-user.dto";

export class ResponseAuthDto {
  accessToken!: string;
  refreshToken!: string;
  user!: ResponseUserDto;
}
