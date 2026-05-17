import type {
  GetWorkerProfileRpcPayload,
  PatchWorkerProfileRpcPayload,
  ResponseUserDto,
} from '@challenge/types';
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

  @MessagePattern('users.profile.me')
  async profileMe(@Payload() payload: { requesterUserId: string }) {
    return this.userService.getDtoForSelf(payload.requesterUserId);
  }

  @MessagePattern('users.profile.byId')
  async profileById(@Payload() payload: GetWorkerProfileRpcPayload) {
    return this.userService.getProfileForViewer(payload);
  }

  @MessagePattern('users.profile.patch')
  async patchProfile(@Payload() payload: PatchWorkerProfileRpcPayload) {
    return this.userService.patchProfile(payload);
  }

  @MessagePattern('users.workers.list')
  async listWorkers(@Payload() payload: { requesterUserId: string }) {
    return this.userService.listWorkersDirectory(payload.requesterUserId);
  }
}
