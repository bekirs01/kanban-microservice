import { UserRole } from '@challenge/types';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('registration_requests')
export class RegistrationRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  username!: string;

  @Column()
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: 'varchar', length: 32 })
  requestedRole!: UserRole;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: 'pending' | 'approved' | 'rejected';

  @CreateDateColumn()
  createdAt!: Date;
}
