import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const TELEGRAM_REMINDER_TYPE_DEADLINE_24H = 'DEADLINE_24H';

@Entity('telegram_deadline_reminders')
@Index(
  'UQ_telegram_deadline_reminders_task_deadline_chat_type',
  ['taskId', 'deadlineAt', 'chatId', 'reminderType'],
  { unique: true },
)
export class TelegramDeadlineReminder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  taskId!: string;

  @Column({ type: 'timestamptz' })
  deadlineAt!: Date;

  @Column({ type: 'varchar', length: 32 })
  chatId!: string;

  @Column({ type: 'varchar', length: 32, default: TELEGRAM_REMINDER_TYPE_DEADLINE_24H })
  reminderType!: string;

  @Column({ type: 'timestamptz' })
  sentAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
