import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from 'db/datasource';
import { LoggerModule } from 'nestjs-pino';
import { CommentModule } from './comment/comment.module';
import { Comment } from './comment/entity/comment.entity';
import { HealthModule } from './health/health.module';
import { HistoryModule } from './history/history.module';
import { TaskHistory } from './history/entity/task-history.entity';
import { TaskModule } from './task/task.module';
import { Task } from './task/entity/task.entity';

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
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRoot({
      ...typeOrmRuntimeOptions,
      entities: [Task, Comment, TaskHistory],
    }),
    TaskModule,
    CommentModule,
    HistoryModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
