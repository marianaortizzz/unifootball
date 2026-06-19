import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddTeamToTournamentDto {
  @ApiProperty({ example: '7b6c5b8e-2f4d-4b1e-8c8a-1d2e3f4a5b6c' })
  @IsUUID()
  teamId!: string;
}
