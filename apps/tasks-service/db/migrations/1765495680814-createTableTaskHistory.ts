import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableTaskHistory1765495680814 implements MigrationInterface {
    name = 'CreateTableTaskHistory1765495680814'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "task_service"."task_history_action_enum" AS ENUM('ASSIGNED', 'STATUS_CHANGE', 'UPDATE', 'CREATED', 'COMMENT', 'DELETE')`);
        await queryRunner.query(`CREATE TABLE "task_service"."task_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "task_id" character varying NOT NULL, "action" "task_service"."task_history_action_enum" NOT NULL, "changes" jsonb NOT NULL, "changed_by" character varying NOT NULL, "changed_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_716670443aea4a2f4a599bb7c53" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "task_service"."task_history"`);
        await queryRunner.query(`DROP TYPE "task_service"."task_history_action_enum"`);
    }

}
