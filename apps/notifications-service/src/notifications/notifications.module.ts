import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entity/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { TelegramRemindersModule } from '../telegram/telegram-reminders.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), TelegramRemindersModule,
  JwtModule.register({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: "7d" },
  })
  ],
  providers: [NotificationsService, NotificationsGateway],
  controllers: [NotificationsController]
})
export class NotificationsModule { }
