import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'object') {
        message = (responseBody as any).message || exception.message;
        error = (responseBody as any).error || exception.name;
      } else {
        message = responseBody;
      }
    }
    else {
      const rpcError = exception instanceof RpcException ? exception.getError() : exception;

      if (typeof rpcError === 'object' && rpcError !== null) {
        const possibleStatus = (rpcError as any).status || (rpcError as any).statusCode;
        if (typeof possibleStatus === 'number') {
          status = possibleStatus;
        }

        message = (rpcError as any).message || message;
        error = (rpcError as any).error || 'Rpc Error';
      }
    }

    response.status(status).json({
      message,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
    });
  }
}