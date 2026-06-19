import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from '../../tournaments/entities/team.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';

@Entity('standings')
@Unique(['tournamentId', 'teamId'])
export class Standing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament!: Tournament;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId!: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId!: string;

  @Column({ name: 'played', type: 'int', default: 0 })
  played!: number;

  @Column({ name: 'won', type: 'int', default: 0 })
  won!: number;

  @Column({ name: 'drawn', type: 'int', default: 0 })
  drawn!: number;

  @Column({ name: 'lost', type: 'int', default: 0 })
  lost!: number;

  @Column({ name: 'goals_for', type: 'int', default: 0 })
  goalsFor!: number;

  @Column({ name: 'goals_against', type: 'int', default: 0 })
  goalsAgainst!: number;

  @Column({ name: 'points', type: 'int', default: 0 })
  points!: number;
}
