import { Logger as NestLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new NestLogger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });

    app.useLogger(app.get(Logger));

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: Number(process.env.TCP_PORT) || 3002,
      },
    });

    await app.startAllMicroservices();

    const httpPort = Number(process.env.HTTP_PORT) || 3012;
    await app.listen(httpPort, "0.0.0.0");

    const appLogger = app.get(Logger);
    appLogger.log(`Auth Service TCP listening on port ${process.env.TCP_PORT || 3002}`);
    appLogger.log(`Auth Service Health Check listening on HTTP port ${httpPort}`);

  } catch (error: any) {
    logger.error('❌ Fatal Error during bootstrap:', error);

    if (error.code === 'EADDRINUSE') {
      logger.error(`Port is already in use. Check if another instance is running.`);
    }

    process.exit(1);
  }
}

bootstrap();