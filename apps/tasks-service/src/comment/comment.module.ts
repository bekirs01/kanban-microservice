import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from 'src/task/entity/task.entity';
import { CommentService } from './comment.service';
import { Comment } from './entity/comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Task]), ClientsModule.register([
    {
      name: "NOTIFICATION_SERVICE",
      transport: Transport.RMQ,
      options: {
        urls: [
          process.env.RABBITMQ_URI || 'amqp://admin:admin@rabbitmq:5672',
        ],
        queue: 'notifications_queue',
        queueOptions: {
          durable: false
        }
      }
    }
  ])],
  providers: [CommentService],
  exports: [CommentService]
})
export class CommentModule { }
