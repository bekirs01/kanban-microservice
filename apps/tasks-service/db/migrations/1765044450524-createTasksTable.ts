import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTasksTable1765044450524 implements MigrationInterface {
    name = 'CreateTasksTable1765044450524'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "task_service"."tasks_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')`);
        await queryRunner.query(`CREATE TYPE "task_service"."tasks_status_enum" AS ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE')`);
        await queryRunner.query(`CREATE TABLE "task_service"."tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "priority" "task_service"."tasks_priority_enum" NOT NULL DEFAULT 'MEDIUM', "status" "task_service"."tasks_status_enum" NOT NULL DEFAULT 'TODO', "deadline" TIMESTAMP NOT NULL, "creatorId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "task_service"."tasks"`);
        await queryRunner.query(`DROP TYPE "task_service"."tasks_status_enum"`);
        await queryRunner.query(`DROP TYPE "task_service"."tasks_priority_enum"`);
    }

}
