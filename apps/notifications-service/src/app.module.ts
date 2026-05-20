import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from 'db/datasource';
import { LoggerModule } from 'nestjs-pino';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { Notification } from './notifications/entity/notification.entity';
import { TelegramDeadlineReminder } from './telegram/entity/telegram-deadline-reminder.entity';

const {
  entities: _entitiesGlob,
  migrations: _migrationsGlob,
  ...typeOrmRuntimeOptions
} = dataSourceOptions;

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined
      }
    }),
    TypeOrmModule.forRoot({
      ...typeOrmRuntimeOptions,
      entities: [Notification, TelegramDeadlineReminder],
    }),
    NotificationsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
