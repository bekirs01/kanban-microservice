import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "TASKS_SERVICE",
        transport: Transport.TCP,
        options: {
          host: process.env.TASKS_SERVICE_HOST || 'localhost',
          port: Number(process.env.TASKS_SERVICE_PORT) || 3003,
        }
      }
    ])
  ],
  controllers: [TasksController]
})
export class TasksModule { }