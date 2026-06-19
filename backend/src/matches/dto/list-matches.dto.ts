import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListMatchesQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar partidos por torneo' })
  @IsOptional()
  @IsUUID()
  tournament_id?: string;
}
