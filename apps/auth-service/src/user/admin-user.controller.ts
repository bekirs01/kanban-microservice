import type { AdminCreateUserRpcPayload, AdminListUsersRpcPayload, AdminUpdateRoleRpcPayload } from '@challenge/types';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller()
export class AdminUserController {
  constructor(private readonly userService: UserService) { }

  @MessagePattern('admin.users.list')
  list(@Payload() payload: AdminListUsersRpcPayload) {
    return this.userService.adminList(payload.requesterUserId);
  }

  @MessagePattern('admin.users.create')
  create(@Payload() payload: AdminCreateUserRpcPayload) {
    return this.userService.adminCreateUser(payload);
  }

  @MessagePattern('admin.users.patchRole')
  patchRole(@Payload() payload: AdminUpdateRoleRpcPayload) {
    return this.userService.adminPatchRole(payload);
  }
}
