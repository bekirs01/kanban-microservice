import {
  AdminCreateUserDto,
  AdminUpdateRoleBodyDto,
  UserRole,
} from "@challenge/types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(@Inject("AUTH_SERVICE") private readonly authClient: ClientProxy) {}

  @Get("users")
  @ApiOperation({ summary: "List accounts (ADMIN only)" })
  @ApiResponse({ status: 200, description: "Users returned." })
  listUsers(@Req() req: any) {
    return this.authClient.send("admin.users.list", {
      requesterUserId: req.user.id,
    });
  }

  @Post("users")
  @ApiOperation({ summary: "Create login account with role (ADMIN only)" })
  @ApiResponse({ status: 201, description: "User created." })
  createUser(@Req() req: any, @Body() dto: AdminCreateUserDto) {
    return this.authClient.send("admin.users.create", {
      ...dto,
      requesterUserId: req.user.id,
    });
  }

  @Patch("users/:id/role")
  @ApiOperation({ summary: "Update user role (ADMIN only)" })
  @ApiParam({ name: "id", description: "User id (UUID)" })
  patchRole(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: AdminUpdateRoleBodyDto,
  ) {
    return this.authClient.send("admin.users.patchRole", {
      requesterUserId: req.user.id,
      targetUserId: id,
      role: body.role,
    });
  }

  @Delete("users/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete user account (ADMIN only)" })
  @ApiParam({ name: "id", description: "User id (UUID)" })
  @ApiResponse({ status: 204 })
  async deleteUser(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    await this.performAdminDeleteUser(req, id);
  }

  @Post("users/:id/delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Delete user account via POST (ADMIN only; use when DELETE is blocked by a proxy)",
  })
  @ApiParam({ name: "id", description: "User id (UUID)" })
  @ApiResponse({ status: 204 })
  async deleteUserPost(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    await this.performAdminDeleteUser(req, id);
  }

  private async performAdminDeleteUser(req: any, id: string) {
    await firstValueFrom(
      this.authClient.send("admin.users.delete", {
        requesterUserId: req.user.id,
        targetUserId: id,
      }),
    );
  }

  @Get("registration-requests")
  @ApiOperation({ summary: "List pending registration requests (ADMIN)" })
  @ApiResponse({ status: 200, description: "Pending requests returned." })
  listPendingRequests(@Req() req: any) {
    return this.authClient.send("admin.registrations.listPending", {
      requesterUserId: req.user.id,
    });
  }

  @Post("registration-requests/:id/approve")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Approve a pending registration request" })
  @ApiParam({ name: "id", description: "Pending request id (UUID)" })
  @ApiResponse({ status: 204 })
  approveRegistration(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    return this.authClient.send("admin.registrations.approve", {
      requesterUserId: req.user.id,
      requestId: id,
    });
  }

  @Post("registration-requests/:id/reject")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Reject a pending registration request" })
  @ApiParam({ name: "id", description: "Pending request id (UUID)" })
  @ApiResponse({ status: 204 })
  rejectRegistration(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    return this.authClient.send("admin.registrations.reject", {
      requesterUserId: req.user.id,
      requestId: id,
    });
  }
}
