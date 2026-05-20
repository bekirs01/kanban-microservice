import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelegramDeadlineReminders1772000000000 implements MigrationInterface {
  name = 'CreateTelegramDeadlineReminders1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_service"."telegram_deadline_reminders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "taskId" uuid NOT NULL,
        "deadlineAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "chatId" character varying(32) NOT NULL,
        "reminderType" character varying(32) NOT NULL DEFAULT 'DEADLINE_24H',
        "sentAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_telegram_deadline_reminders" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_telegram_deadline_reminders_task_deadline_chat_type"
      ON "notification_service"."telegram_deadline_reminders" ("taskId", "deadlineAt", "chatId", "reminderType")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "notification_service"."UQ_telegram_deadline_reminders_task_deadline_chat_type"`,
    );
    await queryRunner.query(`DROP TABLE "notification_service"."telegram_deadline_reminders"`);
  }
}
