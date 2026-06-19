import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MatchResult } from '../matches/entities/match-result.entity';
import { Match } from '../matches/entities/match.entity';
import {
  MatchEvent,
  MatchEventSchema,
} from '../mongo/schemas/match-event.schema';
import { TournamentTeam } from '../tournaments/entities/tournament-team.entity';
import { PlayerStats } from './entities/player-stats.entity';
import { Standing } from './entities/standing.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerStats,
      Standing,
      Match,
      MatchResult,
      TournamentTeam,
    ]),
    MongooseModule.forFeature([
      { name: MatchEvent.name, schema: MatchEventSchema },
    ]),
    AuthModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
