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

    app.enableCors();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URI || 'amqp://admin:admin@localhost:5672'],
        queue: 'notifications_queue',
        queueOptions: { durable: false },
      },
    });

    await app.startAllMicroservices();

    const port = Number(process.env.PORT) || 3004;
    await app.listen(port, '0.0.0.0');

    const appLogger = app.get(Logger);
    appLogger.log(`Notifications Service (HTTP + WebSocket) listening on port ${port}`);

  } catch (error: any) {
    logger.error('❌ Fatal Error during bootstrap:', error);

    if (error.code === 'EADDRINUSE') {
      logger.error(`Port is already in use. Check if another instance is running.`);
    }

    process.exit(1);
  }
}
bootstrap();