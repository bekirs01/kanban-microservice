import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTableUserAddRefreshTokenHashAndPasswordHash1765483388960 implements MigrationInterface {
    name = 'AlterTableUserAddRefreshTokenHashAndPasswordHash1765483388960'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "passwordHash" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "refreshTokenHash" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN "refreshTokenHash"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN "passwordHash"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "password" character varying NOT NULL`);
    }

}
