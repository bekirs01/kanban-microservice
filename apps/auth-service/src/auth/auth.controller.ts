import type { LoginAuthPayload, LogoutAuthPayload, RefreshAuthPayload, RegisterAuthPayload } from '@challenge/types';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @MessagePattern("auth.login")
  login(@Payload() dto: LoginAuthPayload) {
    return this.authService.login(dto);
  }

  @MessagePattern("auth.register")
  register(@Payload() dto: RegisterAuthPayload) {
    return this.authService.register(dto);
  }

  @MessagePattern("auth.refresh")
  refresh(@Payload() dto: RefreshAuthPayload) {
    return this.authService.refresh(dto);
  }

  @MessagePattern("auth.logout")
  logout(@Payload() dto: LogoutAuthPayload) {
    return this.authService.logout(dto);
  }
}
