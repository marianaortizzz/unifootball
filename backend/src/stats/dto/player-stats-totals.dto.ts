import { ApiProperty } from '@nestjs/swagger';

export class PlayerStatsTotalsDto {
  @ApiProperty()
  playerId!: string;

  @ApiProperty()
  matchesPlayed!: number;

  @ApiProperty()
  goals!: number;

  @ApiProperty()
  assists!: number;

  @ApiProperty()
  yellowCards!: number;

  @ApiProperty()
  redCards!: number;

  @ApiProperty()
  minutesPlayed!: number;
}
