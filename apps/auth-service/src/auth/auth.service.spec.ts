import { InvalidTokenException, RefreshTokenReuseException, UnauthorizedRpcException } from "@challenge/exceptions";
import { JwtService } from "@nestjs/jwt";
import { RpcException } from "@nestjs/microservices";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";

jest.mock("bcryptjs")

describe("AuthService", () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockUserService = {
    getByEmail: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    logout: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deve estar definido", () => {
    expect(authService).toBeDefined();
  });

  describe("login", () => {
    const loginDto = { email: "teste@jungle.com", password: "123" };

    const mockUser = {
      id: "uuid-123",
      email: "teste@jungle.com",
      passwordHash: "hash-da-senha",
      username: "thiago"
    };

    it("deve retornar tokens se a senha estiver correta", async () => {
      mockUserService.getByEmail.mockResolvedValue(mockUser);
      mockUserService.update.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue("token-jwt-falso");
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hash-refresh-token");

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty("accessToken", "token-jwt-falso");
      expect(result).toHaveProperty("refreshToken", "token-jwt-falso");
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email
      });
      expect(mockUserService.getByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockUserService.update).toHaveBeenCalledWith(mockUser.id, {
        refreshTokenHash: "hash-refresh-token"
      });
    });

    it("deve lançar UnauthorizedException se a senha estiver errada", async () => {
      mockUserService.getByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedRpcException);
    });
  });

  describe("register", () => {
    const registerDto = {
      email: "novo@jungle.com",
      password: "senha123",
      username: "novousuario"
    };

    const mockUser = {
      id: "uuid-456",
      email: "novo@jungle.com",
      username: "novousuario",
      passwordHash: "hash-senha"
    };

    it("deve registrar um novo usuário e retornar tokens", async () => {
      mockUserService.create.mockResolvedValue(mockUser);
      mockUserService.update.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue("token-jwt-falso");
      (bcrypt.hash as jest.Mock).mockResolvedValue("hash-refresh-token");

      const result = await authService.register(registerDto);

      expect(result).toHaveProperty("accessToken", "token-jwt-falso");
      expect(result).toHaveProperty("refreshToken", "token-jwt-falso");
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email
      });
      expect(mockUserService.create).toHaveBeenCalledWith(registerDto);
      expect(mockUserService.update).toHaveBeenCalledWith(mockUser.id, {
        refreshTokenHash: "hash-refresh-token"
      });
    });
  });

  describe("refresh", () => {
    const refreshPayload = { refreshToken: "valid-refresh-token" };

    const mockUser = {
      id: "uuid-123",
      email: "teste@jungle.com",
      username: "thiago",
      passwordHash: "hash-da-senha",
      refreshTokenHash: "hash-do-refresh-token"
    };

    const mockDecodedJwt = {
      sub: "uuid-123",
      username: "thiago",
      iat: 1234567890,
      exp: 1234567890
    };

    it("deve retornar novos tokens quando o refresh token for válido", async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockDecodedJwt);
      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.update.mockResolvedValue(undefined);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("novo-hash-refresh-token");
      mockJwtService.sign.mockReturnValue("novo-token-jwt");

      const result = await authService.refresh(refreshPayload);

      expect(result).toHaveProperty("accessToken", "novo-token-jwt");
      expect(result).toHaveProperty("refreshToken", "novo-token-jwt");
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email
      });
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(refreshPayload.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      expect(mockUserService.update).toHaveBeenCalledWith(mockUser.id, {
        refreshTokenHash: "novo-hash-refresh-token"
      });
    });

    it("deve lançar RefreshTokenReuseException quando o refresh token for reutilizado", async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockDecodedJwt);
      mockUserService.getById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.refresh(refreshPayload)).rejects.toThrow(RefreshTokenReuseException);
      expect(mockUserService.update).not.toHaveBeenCalled();
    });

    it("deve lançar RefreshTokenReuseException quando o token for inválido ou expirado", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("Token expirado"));

      await expect(authService.refresh(refreshPayload)).rejects.toThrow(RefreshTokenReuseException);
      expect(mockUserService.getById).not.toHaveBeenCalled();
    });

    it("deve re-lançar RpcException quando o erro for uma RpcException", async () => {
      const rpcException = new RpcException("Erro RPC customizado");
      mockJwtService.verifyAsync.mockResolvedValue(mockDecodedJwt);
      mockUserService.getById.mockRejectedValue(rpcException);

      await expect(authService.refresh(refreshPayload)).rejects.toThrow(RpcException);
    });
  });

  describe("logout", () => {
    const logoutPayload = { accessToken: "valid-access-token" };

    const mockDecodedJwt = {
      sub: "uuid-123",
      username: "thiago",
      iat: 1234567890,
      exp: 1234567890
    };

    const mockUser = {
      id: "uuid-123",
      email: "teste@jungle.com",
      username: "thiago"
    };

    it("deve fazer logout com sucesso quando o token for válido", async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockDecodedJwt);
      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.logout.mockResolvedValue(undefined);

      const result = await authService.logout(logoutPayload);

      expect(result).toEqual({});
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(logoutPayload.accessToken, {
        secret: process.env.JWT_REFRESH_SECRET,
        ignoreExpiration: true,
      });
      expect(mockUserService.logout).toHaveBeenCalledWith(mockUser.id);
    });

    it("deve lançar InvalidTokenException quando o token for inválido", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("Token inválido"));

      await expect(authService.logout(logoutPayload)).rejects.toThrow(InvalidTokenException);
      expect(mockUserService.logout).not.toHaveBeenCalled();
    });
  });
});