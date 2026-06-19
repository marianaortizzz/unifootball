import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Los Pumas FC' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    required: false,
    example: 'https://cdn.uni.edu/logos/pumas.png',
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
