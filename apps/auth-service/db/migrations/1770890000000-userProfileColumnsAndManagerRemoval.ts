import { MigrationInterface, QueryRunner } from "typeorm";

export class UserProfileColumnsAndManagerRemoval1770890000000 implements MigrationInterface {
    name = 'UserProfileColumnsAndManagerRemoval1770890000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "auth_service"."users" SET "role" = 'USER' WHERE "role" = 'MANAGER'`);
        await queryRunner.query(`UPDATE "auth_service"."registration_requests" SET "requestedRole" = 'USER' WHERE "requestedRole" = 'MANAGER'`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "displayName" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "specialization" character varying(32)`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "bio" text`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "skills" jsonb`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "avatarData" text`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "telegramContact" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD "githubUrl" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN IF EXISTS "githubUrl"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN IF EXISTS "telegramContact"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN IF EXISTS "avatarData"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN IF EXISTS "skills"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN IF EXISTS "bio"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN IF EXISTS "specialization"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN IF EXISTS "displayName"`);
    }
}
