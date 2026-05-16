import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserController } from './admin-user.controller';
import { RegistrationRequest } from './entity/registration-request.entity';
import { User } from './entity/user.entity';
import { RegistrationAdminTcpController } from './registration-admin.tcp.controller';
import { RegistrationSubmitTcpController } from './registration-submit.tcp.controller';
import { RegistrationService } from './registration.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RegistrationRequest]),
    ClientsModule.register([
      {
        name: "NOTIFICATION_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URI || "amqp://admin:admin@rabbitmq:5672"],
          queue: "notifications_queue",
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [
    UserController,
    AdminUserController,
    RegistrationSubmitTcpController,
    RegistrationAdminTcpController,
  ],
  providers: [UserService, RegistrationService],
  exports: [UserService],
})
export class UserModule { }
