import { MigrationInterface, QueryRunner } from "typeorm";

export class EnsureUserProfileColumnsAgain1770910000000 implements MigrationInterface {
    name = 'EnsureUserProfileColumnsAgain1770910000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD COLUMN IF NOT EXISTS "displayName" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD COLUMN IF NOT EXISTS "specialization" character varying(32)`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD COLUMN IF NOT EXISTS "bio" text`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD COLUMN IF NOT EXISTS "skills" jsonb`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD COLUMN IF NOT EXISTS "avatarData" text`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD COLUMN IF NOT EXISTS "telegramContact" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD COLUMN IF NOT EXISTS "githubUrl" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
