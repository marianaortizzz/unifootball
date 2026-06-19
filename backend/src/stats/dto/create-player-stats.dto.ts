import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreatePlayerStatsDto {
  @ApiProperty({ example: 'b3c1e2f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f' })
  @IsUUID()
  matchId!: string;

  @ApiProperty({ example: 'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 1, minimum: 0, required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  goals?: number;

  @ApiProperty({ example: 0, minimum: 0, required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  assists?: number;

  @ApiProperty({
    example: 0,
    minimum: 0,
    maximum: 2,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  yellowCards?: number;

  @ApiProperty({
    example: 0,
    minimum: 0,
    maximum: 1,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  redCards?: number;

  @ApiProperty({
    example: 90,
    minimum: 0,
    maximum: 120,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  minutesPlayed?: number;
}
