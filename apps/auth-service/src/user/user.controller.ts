import { ResponseUserDto } from '@challenge/types';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @MessagePattern('users.getManyByIds')
  async getManyByIds(@Payload() payload: { ids: string[] }): Promise<ResponseUserDto[]> {
    return this.userService.getManyByIds(payload?.ids ?? []);
  }

  @MessagePattern('users.getAll')
  async getAll(): Promise<ResponseUserDto[]> {
    return this.userService.getAllSimple();
  }
}
