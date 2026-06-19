import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jugador@uni.edu' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'P@ssw0rd123' })
  @IsString()
  @MinLength(6)
  password!: string;
}
