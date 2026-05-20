import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DeadlineReminderService } from './deadline-reminder.service';

@Injectable()
export class DeadlineReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeadlineReminderScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly deadlineReminderService: DeadlineReminderService) {}

  onModuleInit(): void {
    const minutes = this.getScanIntervalMinutes();
    const intervalMs = minutes * 60 * 1000;
    this.timer = setInterval(() => {
      void this.deadlineReminderService.runScan();
    }, intervalMs);
    this.timer.unref?.();
    this.logger.log(`Telegram deadline reminder scan scheduled every ${minutes} minute(s)`);
    void this.deadlineReminderService.runScan();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private getScanIntervalMinutes(): number {
    const parsed = Number(process.env.TELEGRAM_REMINDER_SCAN_INTERVAL_MINUTES ?? '10');
    if (!Number.isFinite(parsed) || parsed < 1) return 10;
    return Math.floor(parsed);
  }
}
