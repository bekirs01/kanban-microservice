import { Task } from "src/task/entity/task.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("comments")
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ nullable: false })
  content!: string

  @ManyToOne(() => Task, (task) => task.comments, { onDelete: "CASCADE" })
  @JoinColumn()
  task!: Task

  @Column()
  authorId!: string

  @Column()
  taskId!: string

  @CreateDateColumn()
  createdAt!: Date;
}