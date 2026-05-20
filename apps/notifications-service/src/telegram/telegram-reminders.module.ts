import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadlineReminderScheduler } from './deadline-reminder.scheduler';
import { DeadlineReminderService } from './deadline-reminder.service';
import { TelegramDeadlineReminder } from './entity/telegram-deadline-reminder.entity';
import { TaskDeadlineQueryService } from './task-deadline-query.service';
import { TelegramNotificationService } from './telegram-notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramDeadlineReminder])],
  providers: [
    TelegramNotificationService,
    TaskDeadlineQueryService,
    DeadlineReminderService,
    DeadlineReminderScheduler,
  ],
  exports: [DeadlineReminderService, TelegramNotificationService],
})
export class TelegramRemindersModule {}
