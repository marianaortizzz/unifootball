import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from './match.entity';

export enum MatchResultStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PLAYED = 'played',
  CANCELLED = 'cancelled',
}

@Entity('match_results')
export class MatchResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match!: Match;

  @Column({ name: 'match_id', type: 'uuid', unique: true })
  matchId!: string;

  @Column({ name: 'home_score', type: 'int', default: 0 })
  homeScore!: number;

  @Column({ name: 'away_score', type: 'int', default: 0 })
  awayScore!: number;

  @Column({
    type: 'enum',
    enum: MatchResultStatus,
    default: MatchResultStatus.PENDING,
  })
  status!: MatchResultStatus;
}
