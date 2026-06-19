import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import {
  MatchEvent,
  MatchEventSchema,
} from '../mongo/schemas/match-event.schema';
import { Stage } from '../tournaments/entities/stage.entity';
import { Team } from '../tournaments/entities/team.entity';
import { MatchResult } from './entities/match-result.entity';
import { Match } from './entities/match.entity';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, MatchResult, Stage, Team, User]),
    MongooseModule.forFeature([
      { name: MatchEvent.name, schema: MatchEventSchema },
    ]),
    AuthModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
