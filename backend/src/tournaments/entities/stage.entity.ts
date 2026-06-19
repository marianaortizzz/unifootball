import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tournament } from './tournament.entity';

export enum StageType {
  GROUPS = 'groups',
  KNOCKOUT = 'knockout',
  FINAL = 'final',
}

@Entity('stages')
export class Stage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament!: Tournament;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'enum', enum: StageType })
  type!: StageType;

  @Column({ name: 'order', type: 'int' })
  order!: number;
}
