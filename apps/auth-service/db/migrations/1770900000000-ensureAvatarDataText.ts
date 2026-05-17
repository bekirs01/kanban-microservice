import { MigrationInterface, QueryRunner } from "typeorm";

export class EnsureAvatarDataText1770900000000 implements MigrationInterface {
  name = "EnsureAvatarDataText1770900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'auth_service'
            AND table_name = 'users'
            AND column_name = 'avatarData'
        ) THEN
          ALTER TABLE "auth_service"."users" ALTER COLUMN "avatarData" TYPE text;
        END IF;
      END $$;
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'auth_service'
            AND table_name = 'users'
            AND column_name = 'avatarData'
        ) THEN
          ALTER TABLE "auth_service"."users" ALTER COLUMN "avatarData" TYPE character varying(255);
        END IF;
      END $$;
      `,
    );
  }
}
