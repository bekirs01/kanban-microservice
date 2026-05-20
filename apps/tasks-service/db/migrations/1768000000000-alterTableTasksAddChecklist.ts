import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTableTasksAddChecklist1768000000000 implements MigrationInterface {
    name = 'AlterTableTasksAddChecklist1768000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "task_service"."tasks" ADD COLUMN IF NOT EXISTS "checklist" jsonb NOT NULL DEFAULT '[]'::jsonb`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "task_service"."tasks" DROP COLUMN IF EXISTS "checklist"`
        );
    }
}
