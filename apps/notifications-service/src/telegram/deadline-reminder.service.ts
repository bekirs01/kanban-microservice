import { TaskStatus } from '@challenge/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TELEGRAM_REMINDER_TYPE_DEADLINE_24H,
  TelegramDeadlineReminder,
} from './entity/telegram-deadline-reminder.entity';
import { TaskDeadlineQueryService, TaskDeadlineRow } from './task-deadline-query.service';
import { TelegramNotificationService } from './telegram-notification.service';

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
};

const STATUS_LABELS: Record<string, string> = {
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  REVIEW: 'На проверке',
  DONE: 'Готово',
};

@Injectable()
export class DeadlineReminderService {
  private readonly logger = new Logger(DeadlineReminderService.name);
  private scanInProgress = false;

  constructor(
    private readonly taskDeadlineQuery: TaskDeadlineQueryService,
    private readonly telegramNotification: TelegramNotificationService,
    @InjectRepository(TelegramDeadlineReminder)
    private readonly reminderRepository: Repository<TelegramDeadlineReminder>,
  ) {}

  getReminderWindowHours(): number {
    const parsed = Number(process.env.TELEGRAM_REMINDER_WINDOW_HOURS ?? '24');
    if (!Number.isFinite(parsed) || parsed <= 0) return 24;
    return parsed;
  }

  private getPersonalChatId(): string {
    return process.env.TELEGRAM_PERSONAL_CHAT_ID?.trim() || '';
  }

  private parseAssigneeIds(raw: string | null): string[] {
    if (!raw?.trim()) return [];
    return raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  private isEligible(task: TaskDeadlineRow, windowHours: number): boolean {
    if (task.archivedAt) return false;
    if (task.status === TaskStatus.DONE) return false;

    const deadline = new Date(task.deadline);
    if (Number.isNaN(deadline.getTime())) return false;

    const now = Date.now();
    const windowMs = windowHours * 60 * 60 * 1000;
    const diff = deadline.getTime() - now;
    return diff > 0 && diff <= windowMs;
  }

  private formatDeadline(deadline: Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(deadline);
  }

  private computeTimeLeft(deadline: Date): { hoursLeft: number; minutesLeft: number } {
    const diffMs = Math.max(0, deadline.getTime() - Date.now());
    const totalMinutes = Math.floor(diffMs / 60000);
    const hoursLeft = Math.floor(totalMinutes / 60);
    const minutesLeft = totalMinutes % 60;
    return { hoursLeft, minutesLeft };
  }

  private async wasReminderSent(
    taskId: string,
    deadlineAt: Date,
    chatId: string,
  ): Promise<boolean> {
    const existing = await this.reminderRepository.findOne({
      where: {
        taskId,
        deadlineAt,
        chatId,
        reminderType: TELEGRAM_REMINDER_TYPE_DEADLINE_24H,
      },
    });
    return Boolean(existing);
  }

  private async recordReminderSent(
    taskId: string,
    deadlineAt: Date,
    chatId: string,
  ): Promise<void> {
    try {
      await this.reminderRepository.save(
        this.reminderRepository.create({
          taskId,
          deadlineAt,
          chatId,
          reminderType: TELEGRAM_REMINDER_TYPE_DEADLINE_24H,
          sentAt: new Date(),
        }),
      );
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === '23505') return;
      throw error;
    }
  }

  async processTaskById(taskId: string): Promise<void> {
    if (!this.telegramNotification.isConfigured()) return;

    const task = await this.taskDeadlineQuery.findTaskById(taskId);
    if (!task) return;

    const windowHours = this.getReminderWindowHours();
    if (!this.isEligible(task, windowHours)) return;

    await this.sendReminderForTask(task);
  }

  async runScan(): Promise<void> {
    if (!this.telegramNotification.isConfigured()) return;
    if (this.scanInProgress) return;

    this.scanInProgress = true;
    try {
      const windowHours = this.getReminderWindowHours();
      const tasks = await this.taskDeadlineQuery.findTasksWithDeadlineWithinHours(windowHours);
      for (const task of tasks) {
        if (!this.isEligible(task, windowHours)) continue;
        await this.sendReminderForTask(task);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Telegram deadline scan failed: ${message}`);
    } finally {
      this.scanInProgress = false;
    }
  }

  private async sendReminderForTask(task: TaskDeadlineRow): Promise<void> {
    const chatId = this.getPersonalChatId();
    if (!chatId) return;

    const deadlineAt = new Date(task.deadline);
    if (await this.wasReminderSent(task.id, deadlineAt, chatId)) return;

    const assigneeIds = this.parseAssigneeIds(task.assigneesRaw);
    const nameMap = await this.taskDeadlineQuery.resolveUserDisplayNames([
      task.creatorId,
      ...assigneeIds,
    ]);

    const creatorName = nameMap.get(task.creatorId) || task.creatorId;
    const assigneesList =
      assigneeIds.length > 0
        ? assigneeIds.map((id) => nameMap.get(id) || id).join(', ')
        : '—';

    const { hoursLeft, minutesLeft } = this.computeTimeLeft(deadlineAt);
    const html = this.telegramNotification.buildDeadlineReminderHtml({
      taskTitle: task.title,
      priority: PRIORITY_LABELS[task.priority] ?? task.priority,
      status: STATUS_LABELS[task.status] ?? task.status,
      deadlineFormatted: this.formatDeadline(deadlineAt),
      hoursLeft,
      minutesLeft,
      descriptionShort: task.description,
      creatorName,
      assigneesList,
    });

    const sent = await this.telegramNotification.sendPersonalHtmlMessage(html);
    if (!sent) return;

    await this.recordReminderSent(task.id, deadlineAt, chatId);
  }
}
