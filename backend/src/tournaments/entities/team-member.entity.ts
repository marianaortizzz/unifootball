import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Team } from './team.entity';

export enum TeamMemberRole {
  PLAYER = 'player',
  CAPTAIN = 'captain',
  GOALKEEPER = 'goalkeeper',
}

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId!: string;

  @Column({ name: 'jersey_number', type: 'int', nullable: true })
  jerseyNumber!: number | null;

  @Column({
    type: 'enum',
    enum: TeamMemberRole,
    default: TeamMemberRole.PLAYER,
  })
  role!: TeamMemberRole;
}
