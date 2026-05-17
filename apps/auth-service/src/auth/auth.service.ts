import { InvalidTokenException, RefreshTokenReuseException, UnauthorizedRpcException } from "@challenge/exceptions";
import { JwtTokenPayload, LoginAuthPayload, LogoutAuthPayload, RefreshAuthPayload, RegisterAuthPayload, ResponseAuthDto } from '@challenge/types';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from "bcryptjs";
import { User } from 'src/user/entity/user.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) { }

  async login(dto: LoginAuthPayload): Promise<ResponseAuthDto> {
    let user = await this.userService.getByEmail(dto.email);
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isMatch) throw new UnauthorizedRpcException();

    user = await this.userService.promoteBootstrapIfNeeded(user);

    const accessToken: string = await this.generateAccessToken(user);
    const refreshToken: string = await this.generateRefreshToken(user);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userService.update(user.id, { refreshTokenHash });
    return {
      accessToken,
      refreshToken,
      user: this.mapAuthUser(user)
    };
  }

  async register(dto: RegisterAuthPayload): Promise<ResponseAuthDto> {
    let user = await this.userService.create(dto);
    user = await this.userService.promoteBootstrapIfNeeded(user);

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userService.update(user.id, { refreshTokenHash });

    return {
      accessToken,
      refreshToken,
      user: this.mapAuthUser(user),
    };
  }

  async refresh(payload: RefreshAuthPayload): Promise<ResponseAuthDto> {
    try {
      const decodedJwt = await this.jwtService.verifyAsync<JwtTokenPayload>(payload.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      let user = await this.userService.getById(decodedJwt.sub);

      if (user.refreshTokenHash == null) {
        throw new RefreshTokenReuseException();
      }

      const isMatch = await bcrypt.compare(payload.refreshToken, user.refreshTokenHash);
      if (!isMatch) throw new RefreshTokenReuseException();

      user = await this.userService.promoteBootstrapIfNeeded(user);

      const accessToken = await this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user);

      const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
      await this.userService.update(user.id, { refreshTokenHash });

      return {
        accessToken,
        refreshToken,
        user: this.mapAuthUser(user),
      };
    } catch (error) {

      if (error instanceof RpcException) {
        throw error;
      }
      throw new RefreshTokenReuseException();
    }
  }

  async logout(payload: LogoutAuthPayload): Promise<Object> {
    try {
      const decodedJwt = await this.jwtService.verifyAsync<JwtTokenPayload>(payload.accessToken, {
        secret: process.env.JWT_REFRESH_SECRET,
        ignoreExpiration: true,
      });

      const user = await this.userService.getById(decodedJwt.sub);

      await this.userService.logout(user.id);
      return {}
    } catch (error) {
      throw new InvalidTokenException();
    }
  }

  private mapAuthUser(user: User) {
    return this.userService.toResponseDto(user);
  }

  private async generateAccessToken(user: User) {
    const payload: Omit<JwtTokenPayload, "iat" | "exp"> = { sub: user.id, username: user.username, role: user.role };
    return this.jwtService.sign(payload, { expiresIn: "15m" });
  }
  private async generateRefreshToken(user: User) {
    const payload: Omit<JwtTokenPayload, "iat" | "exp"> = { sub: user.id, username: user.username, role: user.role };
    return this.jwtService.sign(payload, { expiresIn: "7d" });
  }
}
