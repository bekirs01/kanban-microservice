import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from 'dotenv';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';
import {
  UPLOAD_ROOT,
  ensureUploadDirsSync,
} from './upload/upload.paths';

config();

async function bootstrap() {
  const logger = new NestLogger('Bootstrap');
  try {

    ensureUploadDirsSync();

    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

    app.useStaticAssets(UPLOAD_ROOT, {
      prefix: '/api/uploads/',
      index: false,
      fallthrough: true,
    });

    app.useLogger(app.get(Logger));

    app.setGlobalPrefix('api');

    const config = new DocumentBuilder()
      .setTitle("Jungle Challenge API")
      .setDescription("API Gateway documentation")
      .setVersion("1.0")
      .addTag("tasks")
      .addTag("auth")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      jsonDocumentUrl: "api/json"
    });

    const defaultOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
    ];
    const envOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const allowAll = envOrigins.includes('*');

    app.enableCors({
      origin: allowAll ? true : [...defaultOrigins, ...envOrigins],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Content-Type, Accept, Authorization',
    });

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true
    }));

    app.useGlobalFilters(new RpcExceptionFilter());

    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');

    const appLogger = app.get(Logger)
    appLogger.log(`API Gateway running on port ${port}`);
    appLogger.log(`Health Check available at http://localhost:${port}/api/health`);
    appLogger.log(`Swagger available at http://localhost:${port}/api/docs`);
  } catch (error: any) {
    logger.error('❌ Fatal Error during bootstrap:', error);

    if (error.code === 'EADDRINUSE') {
      logger.error(`Port is already in use. Check if another instance is running.`);
    }

    process.exit(1);
  }
}
bootstrap();