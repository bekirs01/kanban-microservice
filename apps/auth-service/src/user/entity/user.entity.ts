import { UserRole, WorkerSpecialization } from "@challenge/types";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 32, default: UserRole.USER })
  role!: UserRole;

  @Column({ type: "varchar", length: 512, nullable: true })
  refreshTokenHash!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  displayName!: string | null;

  @Column({
    type: "varchar",
    length: 32,
    nullable: true,
  })
  specialization!: WorkerSpecialization | null;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({ type: "jsonb", nullable: true })
  skills!: string[] | null;

  @Column({ type: "text", nullable: true })
  avatarData!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  telegramContact!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  githubUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
