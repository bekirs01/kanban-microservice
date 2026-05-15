import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: "userId" })
  userId!: string;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn({ name: "createdAt" })
  createdAt!: Date;
}