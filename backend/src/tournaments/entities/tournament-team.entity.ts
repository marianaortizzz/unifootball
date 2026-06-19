import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from './team.entity';
import { Tournament } from './tournament.entity';

@Entity('tournament_teams')
@Unique(['tournamentId', 'teamId'])
export class TournamentTeam {
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

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt!: Date;
}
