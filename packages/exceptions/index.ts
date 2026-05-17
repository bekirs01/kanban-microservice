import { RpcException } from '@nestjs/microservices';

export class UserAlreadyExistsException extends RpcException {
  constructor(message: string = 'Email or username already in use') {
    super({ statusCode: 409, message });
  }
}

export class UserNotFoundException extends RpcException {
  constructor(message: string = 'User not found') {
    super({ statusCode: 404, message });
  }
}

export class UnauthorizedRpcException extends RpcException {
  constructor(message: string = 'Unauthorized') {
    super({ statusCode: 401, message });
  }
}

export class ForbiddenRpcException extends RpcException {
  constructor(message: string = 'Forbidden') {
    super({ statusCode: 403, message });
  }
}

export class InvalidCredentialsException extends RpcException {
  constructor(message: string = 'Invalid credentials') {
    super({ statusCode: 401, message });
  }
}

export class InvalidTokenException extends RpcException {
  constructor(message: string = 'Invalid or expired token') {
    super({ statusCode: 401, message });
  }
}

export class RefreshTokenReuseException extends RpcException {
  constructor(message: string = 'Invalid or reused refresh token') {
    super({ statusCode: 401, message });
  }
}

export class TaskNotFoundRpcException extends RpcException {
  constructor(message = 'Task not found') {
    super({ statusCode: 404, message });
  }
}
