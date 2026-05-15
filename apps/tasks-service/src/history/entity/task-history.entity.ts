import { ActionType } from "@challenge/types";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export interface AuditChanges {
  old: Record<string, any>;
  new: Record<string, any>;
}

@Entity("task_history")
export class TaskHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "task_id" })
  taskId!: string;

  @Column({
    type: "enum",
    enum: ActionType
  })
  action!: ActionType;

  @Column({ type: "jsonb" })
  changes!: AuditChanges;

  @Column({ name: "changed_by" })
  changedBy!: string;

  @CreateDateColumn({ name: "changed_at" })
  changedAt!: Date;
}