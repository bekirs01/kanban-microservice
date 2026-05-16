import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    AuthModule,
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.AUTH_SERVICE_HOST || 'localhost',
          port: Number(process.env.AUTH_SERVICE_PORT) || 3002,
        },
      },
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule { }
