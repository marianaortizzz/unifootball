import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import {
  MatchResult,
  MatchResultStatus,
} from '../matches/entities/match-result.entity';
import { Match } from '../matches/entities/match.entity';
import {
  MatchEvent,
  MatchEventDocument,
} from '../mongo/schemas/match-event.schema';
import { TournamentTeam } from '../tournaments/entities/tournament-team.entity';
import { CreateMatchEventDto } from './dto/create-match-event.dto';
import { CreatePlayerStatsDto } from './dto/create-player-stats.dto';
import { PlayerStatsTotalsDto } from './dto/player-stats-totals.dto';
import { PlayerStats } from './entities/player-stats.entity';
import { Standing } from './entities/standing.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(PlayerStats)
    private readonly playerStatsRepo: Repository<PlayerStats>,
    @InjectRepository(Standing)
    private readonly standingRepo: Repository<Standing>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(TournamentTeam)
    private readonly tournamentTeamRepo: Repository<TournamentTeam>,
    @InjectModel(MatchEvent.name)
    private readonly matchEventModel: Model<MatchEventDocument>,
  ) {}

  async getPlayerTotals(playerId: string): Promise<PlayerStatsTotalsDto> {
    const rows = await this.playerStatsRepo.find({
      where: { userId: playerId },
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.goals += row.goals;
        acc.assists += row.assists;
        acc.yellowCards += row.yellowCards;
        acc.redCards += row.redCards;
        acc.minutesPlayed += row.minutesPlayed;
        return acc;
      },
      {
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        minutesPlayed: 0,
      },
    );

    return {
      playerId,
      matchesPlayed: rows.length,
      ...totals,
    };
  }

  getStandings(tournamentId: string): Promise<Standing[]> {
    return this.standingRepo.find({
      where: { tournamentId },
      relations: { team: true },
      order: { points: 'DESC', goalsFor: 'DESC' },
    });
  }

  async createMatchEvent(dto: CreateMatchEventDto): Promise<MatchEvent> {
    const created = await this.matchEventModel.create({
      matchId: dto.matchId,
      type: dto.type,
      minute: dto.minute,
      playerId: dto.playerId,
      teamId: dto.teamId,
      description: dto.description ?? null,
      createdAt: new Date(),
    });
    return created.toObject();
  }

  getMatchEvents(matchId: string): Promise<MatchEvent[]> {
    return this.matchEventModel
      .find({ matchId })
      .sort({ minute: 1, createdAt: 1 })
      .lean()
      .exec();
  }

  // Upsert por (matchId, userId): si ya hay registro lo actualiza,
  // si no, lo crea. Útil para llenar datos de un partido jugado.
  async upsertPlayerStats(dto: CreatePlayerStatsDto): Promise<PlayerStats> {
    const match = await this.matchRepo.findOne({ where: { id: dto.matchId } });
    if (!match) {
      throw new NotFoundException(`Partido ${dto.matchId} no encontrado`);
    }
    let row = await this.playerStatsRepo.findOne({
      where: { matchId: dto.matchId, userId: dto.userId },
    });
    if (!row) {
      row = this.playerStatsRepo.create({
        matchId: dto.matchId,
        userId: dto.userId,
      });
    }
    row.goals = dto.goals ?? 0;
    row.assists = dto.assists ?? 0;
    row.yellowCards = dto.yellowCards ?? 0;
    row.redCards = dto.redCards ?? 0;
    row.minutesPlayed = dto.minutesPlayed ?? 0;
    return this.playerStatsRepo.save(row);
  }

  // Reconstruye la tabla de posiciones desde los match_results en estado PLAYED
  // de partidos cuyo stage pertenece al torneo dado.
  async recalculateStandings(tournamentId: string): Promise<Standing[]> {
    const registrations = await this.tournamentTeamRepo.find({
      where: { tournamentId },
    });
    if (registrations.length === 0) {
      throw new NotFoundException(
        `No hay equipos inscritos en el torneo ${tournamentId}`,
      );
    }

    const rows = await this.matchRepo
      .createQueryBuilder('match')
      .innerJoin('match.stage', 'stage')
      .innerJoinAndMapOne(
        'match.result',
        MatchResult,
        'result',
        'result.match_id = match.id',
      )
      .where('stage.tournament_id = :tournamentId', { tournamentId })
      .andWhere('result.status = :status', {
        status: MatchResultStatus.PLAYED,
      })
      .getMany();

    const table = new Map<string, Standing>();
    for (const reg of registrations) {
      table.set(
        reg.teamId,
        this.standingRepo.create({
          tournamentId,
          teamId: reg.teamId,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
        }),
      );
    }

    for (const match of rows) {
      const result = (match as Match & { result: MatchResult }).result;
      const home = table.get(match.homeTeamId);
      const away = table.get(match.awayTeamId);
      if (!home || !away) continue;
      home.played++;
      away.played++;
      home.goalsFor += result.homeScore;
      home.goalsAgainst += result.awayScore;
      away.goalsFor += result.awayScore;
      away.goalsAgainst += result.homeScore;
      if (result.homeScore > result.awayScore) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (result.homeScore < result.awayScore) {
        away.won++;
        away.points += 3;
        home.lost++;
      } else {
        home.drawn++;
        away.drawn++;
        home.points += 1;
        away.points += 1;
      }
    }

    // Reemplaza la tabla del torneo: borra y reescribe.
    await this.standingRepo.delete({ tournamentId });
    const saved = await this.standingRepo.save([...table.values()]);
    return saved.sort(
      (a, b) =>
        b.points - a.points ||
        b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst),
    );
  }
}
