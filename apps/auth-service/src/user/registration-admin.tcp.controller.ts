import type {
  AdminListRegistrationsRpcPayload,
  AdminRegistrationDecisionRpcPayload,
} from "@challenge/types";
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { RegistrationService } from "./registration.service";

@Controller()
export class RegistrationAdminTcpController {
  constructor(private readonly registrationService: RegistrationService) {}

  @MessagePattern("admin.registrations.listPending")
  listPending(@Payload() payload: AdminListRegistrationsRpcPayload) {
    return this.registrationService.listPendingForAdmin(payload);
  }

  @MessagePattern("admin.registrations.approve")
  approve(@Payload() payload: AdminRegistrationDecisionRpcPayload) {
    return this.registrationService.approve(payload);
  }

  @MessagePattern("admin.registrations.reject")
  reject(@Payload() payload: AdminRegistrationDecisionRpcPayload) {
    return this.registrationService.reject(payload);
  }
}
