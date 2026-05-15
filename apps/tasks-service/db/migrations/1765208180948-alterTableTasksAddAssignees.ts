import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTableTasksAddAssignees1765208180948 implements MigrationInterface {
    name = 'AlterTableTasksAddAssignees1765208180948'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_service"."tasks" ADD "assignees" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_service"."tasks" DROP COLUMN "assignees"`);
    }

}
