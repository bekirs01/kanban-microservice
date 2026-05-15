import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentModule } from 'src/comment/comment.module';
import { TaskHistory } from 'src/history/entity/task-history.entity';
import { Task } from './entity/task.entity';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskHistory]), ClientsModule.register([
    {
      name: "NOTIFICATION_SERVICE",
      transport: Transport.RMQ,
      options: {
        urls: ["amqp://admin:admin@localhost:5672"],
        queue: "notification_queue",
        queueOptions: {
          durable: false
        }
      }
    }
  ]), CommentModule],
  controllers: [TaskController],
  providers: [TaskService]
})
export class TaskModule { }
