import type { PatchWorkerProfileDto } from "@challenge/types";
import { UserRole } from "@challenge/types";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("workers")
@ApiBearerAuth()
@Controller("workers")
@UseGuards(AuthGuard("jwt"))
export class WorkersController {
  constructor(@Inject("AUTH_SERVICE") private readonly authClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: "Directory of worker accounts (USER role)" })
  listDirectory(@Req() req: any) {
    return this.authClient.send("users.workers.list", {
      requesterUserId: req.user.id,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Worker profile detail" })
  @ApiParam({ name: "id", description: "User id (UUID)" })
  getById(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    return this.authClient.send("users.profile.byId", {
      requesterUserId: req.user.id,
      targetUserId: id,
    });
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "ADMIN: update worker (USER role) profile" })
  @ApiParam({ name: "id", description: "User id (UUID)" })
  patchWorker(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: PatchWorkerProfileDto,
  ) {
    return this.authClient.send("users.profile.patch", {
      requesterUserId: req.user.id,
      targetUserId: id,
      body,
    });
  }
}
