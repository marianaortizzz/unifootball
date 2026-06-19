import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Match } from '../../matches/entities/match.entity';

@Entity('players_stats')
export class PlayerStats {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match!: Match;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @Column({ name: 'goals', type: 'int', default: 0 })
  goals!: number;

  @Column({ name: 'assists', type: 'int', default: 0 })
  assists!: number;

  @Column({ name: 'yellow_cards', type: 'int', default: 0 })
  yellowCards!: number;

  @Column({ name: 'red_cards', type: 'int', default: 0 })
  redCards!: number;

  @Column({ name: 'minutes_played', type: 'int', default: 0 })
  minutesPlayed!: number;
}
