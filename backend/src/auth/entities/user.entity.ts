import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserRole {
  PLAYER = 'player',
  REFEREE = 'referee',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar' })
  password!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PLAYER })
  role!: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
