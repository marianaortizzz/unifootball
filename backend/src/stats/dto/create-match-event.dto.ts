import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { MatchEventType } from '../../mongo/schemas/match-event.schema';

export class CreateMatchEventDto {
  @ApiProperty({ example: 'b3c1e2f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f' })
  @IsUUID()
  matchId!: string;

  @ApiProperty({ enum: MatchEventType, example: MatchEventType.GOAL })
  @IsEnum(MatchEventType)
  type!: MatchEventType;

  @ApiProperty({ example: 23 })
  @IsInt()
  @Min(0)
  minute!: number;

  @ApiProperty({ example: 'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a' })
  @IsUUID()
  playerId!: string;

  @ApiProperty({ example: 'a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d' })
  @IsUUID()
  teamId!: string;

  @ApiProperty({
    required: false,
    example: 'Gol de cabeza tras tiro de esquina',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
