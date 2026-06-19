import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Stage } from './entities/stage.entity';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';
import { TournamentTeam } from './entities/tournament-team.entity';
import { Tournament } from './entities/tournament.entity';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      Team,
      TournamentTeam,
      TeamMember,
      Stage,
      User,
    ]),
    AuthModule,
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TypeOrmModule],
})
export class TournamentsModule {}
