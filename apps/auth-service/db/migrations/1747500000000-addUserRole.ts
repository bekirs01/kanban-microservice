import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRole1747500000000 implements MigrationInterface {
    name = 'AddUserRole1747500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "role" character varying NOT NULL DEFAULT 'USER'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN "role"`);
    }
}
