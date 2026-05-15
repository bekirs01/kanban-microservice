import { LoginAuthDto, LogoutAuthPayload, RefreshAuthDto, RegisterAuthDto } from '@challenge/types';
import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';

@ApiTags("auth")
@Controller('/auth')
export class AuthController {
  constructor(
    @Inject("AUTH_SERVICE") private readonly authClient: ClientProxy
  ) { }

  @Post("/login")
  @ApiOperation({ summary: "Login do usuário" })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso. Retorna tokens (access_token, refresh_token).' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas (Email ou senha incorretos).' })
  @ApiBody({ type: LoginAuthDto })
  login(@Body() dto: LoginAuthDto) {
    return this.authClient.send("auth.login", dto);
  }

  @Post("/register")
  @ApiOperation({ summary: "Registrar novo usuário" })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso. Retorna tokens (access_token, refresh_token, user).' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos ou usuário já existe.' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado.' })
  @ApiBody({ type: RegisterAuthDto })
  register(@Body() dto: RegisterAuthDto) {
    return this.authClient.send("auth.register", dto);
  }

  @Post("/refresh")
  @ApiOperation({ summary: "Renovar token de acesso" })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso. Retorna novo access_token.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  @ApiBody({ type: RefreshAuthDto })
  refresh(@Body() dto: RefreshAuthDto) {
    return this.authClient.send("auth.refresh", dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("/logout")
  @ApiOperation({ summary: "Realizar logout do usuário" })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso. Invalida o refresh token do usuário.' })
  logout(@Req() request: any) {
    const payload: LogoutAuthPayload = {
      accessToken: request.headers['authorization'].substring(("Bearer ").length),
    }
    return this.authClient.send("auth.logout", payload);
  }
}