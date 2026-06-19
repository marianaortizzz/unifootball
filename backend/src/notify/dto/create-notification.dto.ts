import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ example: 'b3c1e2f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'Partido reprogramado' })
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  title!: string;

  @ApiProperty({
    example: 'Tu partido del sábado se movió al domingo a las 18:00',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}
