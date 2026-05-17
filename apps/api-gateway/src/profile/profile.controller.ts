import type { PatchWorkerProfileDto } from "@challenge/types";
import { Body, Controller, Get, Inject, Patch, Req, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("profile")
@ApiBearerAuth()
@Controller("profile")
@UseGuards(AuthGuard("jwt"))
export class ProfileController {
  constructor(@Inject("AUTH_SERVICE") private readonly authClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: "Current authenticated user profile" })
  getMine(@Req() req: any) {
    return this.authClient.send("users.profile.me", {
      requesterUserId: req.user.id,
    });
  }

  @Patch()
  @ApiOperation({ summary: "Update own worker profile fields" })
  patchMine(@Req() req: any, @Body() body: PatchWorkerProfileDto) {
    return this.authClient.send("users.profile.patch", {
      requesterUserId: req.user.id,
      body,
    });
  }
}
