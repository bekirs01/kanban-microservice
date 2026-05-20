import { Injectable, Logger } from '@nestjs/common';
import { escapeTelegramHtml, truncateText } from './telegram-html.util';

export interface TelegramDeadlineMessageInput {
  taskTitle: string;
  priority: string;
  status: string;
  deadlineFormatted: string;
  hoursLeft: number;
  minutesLeft: number;
  descriptionShort: string;
  creatorName: string;
  assigneesList: string;
}

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  private readonly personalChatId = process.env.TELEGRAM_PERSONAL_CHAT_ID?.trim() || '';

  isConfigured(): boolean {
    return Boolean(this.botToken && this.personalChatId && this.isPersonalChatId(this.personalChatId));
  }

  getConfigurationStatus(): { botToken: boolean; personalChatId: boolean; ready: boolean } {
    const botToken = Boolean(this.botToken);
    const personalChatId = Boolean(this.personalChatId && this.isPersonalChatId(this.personalChatId));
    return { botToken, personalChatId, ready: botToken && personalChatId };
  }

  private isPersonalChatId(chatId: string): boolean {
    if (!/^\d+$/.test(chatId)) return false;
    const numeric = BigInt(chatId);
    return numeric > 0n;
  }

  buildDeadlineReminderHtml(input: TelegramDeadlineMessageInput): string {
    const taskTitle = escapeTelegramHtml(input.taskTitle);
    const priority = escapeTelegramHtml(input.priority);
    const status = escapeTelegramHtml(input.status);
    const deadlineFormatted = escapeTelegramHtml(input.deadlineFormatted);
    const descriptionShort = escapeTelegramHtml(truncateText(input.descriptionShort || '—', 400));
    const creatorName = escapeTelegramHtml(input.creatorName);
    const assigneesList = escapeTelegramHtml(input.assigneesList || '—');

    return [
      '⏰ <b>Напоминание о дедлайне</b>',
      '',
      `📌 <b>Задача:</b> ${taskTitle}`,
      `🔥 <b>Приоритет:</b> ${priority}`,
      `📍 <b>Статус:</b> ${status}`,
      `🗓 <b>Срок:</b> ${deadlineFormatted}`,
      `⏳ <b>Осталось:</b> ${input.hoursLeft} ч. ${input.minutesLeft} мин.`,
      '',
      '📝 <b>Описание:</b>',
      descriptionShort,
      '',
      `👤 <b>Автор:</b> ${creatorName}`,
      `👥 <b>Работники:</b> ${assigneesList}`,
      '',
      'Откройте доску задач и завершите работу вовремя.',
    ].join('\n');
  }

  async sendPersonalHtmlMessage(html: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('Telegram DM reminders skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_PERSONAL_CHAT_ID is not configured');
      return false;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.personalChatId,
          text: html,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Telegram sendMessage failed with status ${response.status}: ${body.slice(0, 200)}`);
        return false;
      }

      const payload = (await response.json()) as { ok?: boolean };
      if (!payload.ok) {
        this.logger.warn('Telegram sendMessage returned ok=false');
        return false;
      }

      this.logger.log(`Telegram deadline reminder sent to personal chat ${this.personalChatId}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Telegram sendMessage error: ${message}`);
      return false;
    }
  }

  async sendTestMessage(): Promise<boolean> {
    const html = [
      '✅ <b>Тест напоминания Kanban</b>',
      '',
      'Это тестовое личное сообщение бота.',
      'Если вы видите это сообщение, TELEGRAM_BOT_TOKEN и TELEGRAM_PERSONAL_CHAT_ID настроены правильно.',
    ].join('\n');
    return this.sendPersonalHtmlMessage(html);
  }
}
