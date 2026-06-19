import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';

export enum SanctionType {
  YELLOW = 'yellow',
  RED = 'red',
  SUSPENSION = 'suspension',
}

@Entity('sanctions')
export class Sanction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player!: User;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId!: string;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament!: Tournament;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId!: string;

  @Column({ name: 'type', type: 'enum', enum: SanctionType })
  type!: SanctionType;

  @Column({ name: 'reason', type: 'varchar', nullable: true })
  reason!: string | null;

  @Column({ name: 'matches_suspended', type: 'int', default: 1 })
  matchesSuspended!: number;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt!: Date;
}
