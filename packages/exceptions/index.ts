import { RpcException } from '@nestjs/microservices';

export class UserAlreadyExistsException extends RpcException {
  constructor(message: string = 'Email/Usuário já utilizados') {
    super({ statusCode: 409, message });
  }
}

export class UserNotFoundException extends RpcException {
  constructor(message: string = 'Usuário não encontrado') {
    super({ statusCode: 404, message });
  }
}

export class UnauthorizedRpcException extends RpcException {
  constructor(message: string = 'Não autorizado') {
    super({ statusCode: 401, message });
  }
}

export class InvalidCredentialsException extends RpcException {
  constructor(message: string = 'Credenciais inválidas') {
    super({ statusCode: 401, message });
  }
}

export class InvalidTokenException extends RpcException {
  constructor(message: string = 'Token inválido ou expirado') {
    super({ statusCode: 401, message });
  }
}

export class RefreshTokenReuseException extends RpcException {
  constructor(message: string = 'Refresh token inválido ou reutilizado') {
    super({ statusCode: 401, message });
  }
}

export class TaskNotFoundRpcException extends RpcException {
  constructor(message = 'Task não encontrada') {
    super({ statusCode: 404, message });
  }
}
