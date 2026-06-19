import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Stage } from '../../tournaments/entities/stage.entity';
import { Team } from '../../tournaments/entities/team.entity';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Stage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stage_id' })
  stage!: Stage;

  @Column({ name: 'stage_id', type: 'uuid' })
  stageId!: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'home_team_id' })
  homeTeam!: Team;

  @Column({ name: 'home_team_id', type: 'uuid' })
  homeTeamId!: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'away_team_id' })
  awayTeam!: Team;

  @Column({ name: 'away_team_id', type: 'uuid' })
  awayTeamId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referee_id' })
  referee!: User | null;

  @Column({ name: 'referee_id', type: 'uuid', nullable: true })
  refereeId!: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  venue!: string | null;
}
