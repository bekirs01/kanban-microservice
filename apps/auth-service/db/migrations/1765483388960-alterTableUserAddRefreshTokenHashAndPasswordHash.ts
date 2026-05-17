import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTableUserAddRefreshTokenHashAndPasswordHash1765483388960 implements MigrationInterface {
    name = 'AlterTableUserAddRefreshTokenHashAndPasswordHash1765483388960'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'auth_service'
                      AND table_name = 'users'
                      AND column_name = 'password'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'auth_service'
                      AND table_name = 'users'
                      AND column_name = 'passwordHash'
                ) THEN
                    ALTER TABLE "auth_service"."users" RENAME COLUMN "password" TO "passwordHash";
                ELSIF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'auth_service'
                      AND table_name = 'users'
                      AND column_name = 'password'
                ) AND EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'auth_service'
                      AND table_name = 'users'
                      AND column_name = 'passwordHash'
                ) THEN
                    UPDATE "auth_service"."users"
                    SET "passwordHash" = "password"
                    WHERE "passwordHash" IS NULL AND "password" IS NOT NULL;
                    ALTER TABLE "auth_service"."users" DROP COLUMN "password";
                ELSIF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'auth_service'
                      AND table_name = 'users'
                      AND column_name = 'passwordHash'
                ) THEN
                    ALTER TABLE "auth_service"."users" ADD "passwordHash" character varying;
                END IF;
            END $$;
        `);
        await queryRunner.query(`UPDATE "auth_service"."users" SET "passwordHash" = 'legacy-password-migration-required' WHERE "passwordHash" IS NULL`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ALTER COLUMN "passwordHash" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD COLUMN IF NOT EXISTS "refreshTokenHash" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN IF EXISTS "refreshTokenHash"`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ADD COLUMN IF NOT EXISTS "password" character varying`);
        await queryRunner.query(`UPDATE "auth_service"."users" SET "password" = "passwordHash" WHERE "password" IS NULL`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" ALTER COLUMN "password" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auth_service"."users" DROP COLUMN IF EXISTS "passwordHash"`);
    }

}
