import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'jugador@uni.edu' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Andrés López' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'P@ssw0rd123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: UserRole, required: false, default: UserRole.PLAYER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
