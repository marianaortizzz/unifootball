import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TournamentFormat {
  LEAGUE = 'league',
  KNOCKOUT = 'knockout',
  GROUPS = 'groups',
}

export enum TournamentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', default: 'football' })
  sport!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: Date;

  @Column({ type: 'enum', enum: TournamentFormat })
  format!: TournamentFormat;

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  status!: TournamentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
