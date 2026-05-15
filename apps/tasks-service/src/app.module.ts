import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from 'db/datasource';
import { LoggerModule } from 'nestjs-pino';
import { CommentModule } from './comment/comment.module';
import { HealthModule } from './health/health.module';
import { HistoryModule } from './history/history.module';
import { TaskModule } from './task/task.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined
      }
    }),
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    TaskModule,
    CommentModule,
    HistoryModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
