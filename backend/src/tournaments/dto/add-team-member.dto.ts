import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TeamMemberRole } from '../entities/team-member.entity';

export class AddTeamMemberDto {
  @ApiProperty({ example: '7b6c5b8e-2f4d-4b1e-8c8a-1d2e3f4a5b6c' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ required: false, example: 10, minimum: 1, maximum: 99 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  jerseyNumber?: number;

  @ApiProperty({ enum: TeamMemberRole, required: false })
  @IsOptional()
  @IsEnum(TeamMemberRole)
  role?: TeamMemberRole;
}
