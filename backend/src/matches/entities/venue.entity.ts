import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar' })
  name!: string;

  @Column({ name: 'location', type: 'varchar', nullable: true })
  location!: string | null;

  @Column({ name: 'capacity', type: 'int', nullable: true })
  capacity!: number | null;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable!: boolean;
}
