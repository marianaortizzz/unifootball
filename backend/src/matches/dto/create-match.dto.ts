import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMatchDto {
  @ApiProperty({ example: 'b3c1e2f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f' })
  @IsUUID()
  stageId!: string;

  @ApiProperty({ example: 'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a' })
  @IsUUID()
  homeTeamId!: string;

  @ApiProperty({ example: 'a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d' })
  @IsUUID()
  awayTeamId!: string;

  @ApiProperty({
    required: false,
    example: 'd1e2f3a4-1234-5678-9abc-1b2c3d4e5f6a',
  })
  @IsOptional()
  @IsUUID()
  refereeId?: string;

  @ApiProperty({ example: '2026-08-15T19:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ required: false, example: 'Cancha 3 - Campus Norte' })
  @IsOptional()
  @IsString()
  venue?: string;
}
