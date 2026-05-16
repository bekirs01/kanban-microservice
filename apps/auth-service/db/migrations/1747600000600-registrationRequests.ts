import { MigrationInterface, QueryRunner } from "typeorm";

export class RegistrationRequests1747600000600 implements MigrationInterface {
    name = 'RegistrationRequests1747600000600'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_service"."registration_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "username" character varying NOT NULL,
                "email" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "requestedRole" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_registration_requests_id" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "auth_service"."registration_requests"`);
    }
}
