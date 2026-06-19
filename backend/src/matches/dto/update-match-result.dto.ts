import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MatchResultStatus } from '../entities/match-result.entity';

export class UpdateMatchResultDto {
  @ApiProperty({ example: 2, minimum: 0 })
  @IsInt()
  @Min(0)
  homeScore!: number;

  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  awayScore!: number;

  @ApiProperty({ enum: MatchResultStatus, required: false })
  @IsOptional()
  @IsEnum(MatchResultStatus)
  status?: MatchResultStatus;
}
