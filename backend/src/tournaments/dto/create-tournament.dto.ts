import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  TournamentFormat,
  TournamentStatus,
} from '../entities/tournament.entity';

export class CreateTournamentDto {
  @ApiProperty({ example: 'Liga Universitaria 2026' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ example: 'football', required: false, default: 'football' })
  @IsOptional()
  @IsString()
  sport?: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-12-15' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ enum: TournamentFormat })
  @IsEnum(TournamentFormat)
  format!: TournamentFormat;

  @ApiProperty({ enum: TournamentStatus, required: false })
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;
}
