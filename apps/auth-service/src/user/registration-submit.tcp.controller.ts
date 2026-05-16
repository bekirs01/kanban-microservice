import type { SubmitRegistrationRpcPayload } from "@challenge/types";
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { RegistrationService } from "./registration.service";

@Controller()
export class RegistrationSubmitTcpController {
  constructor(private readonly registrationService: RegistrationService) {}

  @MessagePattern("auth.registration.submit")
  submit(@Payload() dto: SubmitRegistrationRpcPayload) {
    return this.registrationService.submit(dto);
  }
}
