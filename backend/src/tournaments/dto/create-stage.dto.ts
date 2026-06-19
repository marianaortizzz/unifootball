import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Min, MinLength } from 'class-validator';
import { StageType } from '../entities/stage.entity';

export class CreateStageDto {
  @ApiProperty({ example: 'Fase Regular' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: StageType, example: StageType.GROUPS })
  @IsEnum(StageType)
  type!: StageType;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  order!: number;
}
