import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { In, Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import {
  MatchEvent,
  MatchEventDocument,
} from '../mongo/schemas/match-event.schema';
import { Stage } from '../tournaments/entities/stage.entity';
import { Team } from '../tournaments/entities/team.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { LiveMatchDto } from './dto/live-match.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { MatchResult, MatchResultStatus } from './entities/match-result.entity';
import { Match } from './entities/match.entity';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchResult)
    private readonly resultRepo: Repository<MatchResult>,
    @InjectRepository(Stage)
    private readonly stageRepo: Repository<Stage>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectModel(MatchEvent.name)
    private readonly matchEventModel: Model<MatchEventDocument>,
  ) {}

  async create(dto: CreateMatchDto): Promise<Match> {
    if (dto.homeTeamId === dto.awayTeamId) {
      throw new BadRequestException(
        'El equipo local y visitante no pueden ser el mismo',
      );
    }

    const stage = await this.stageRepo.findOne({ where: { id: dto.stageId } });
    if (!stage) {
      throw new NotFoundException(`Stage ${dto.stageId} no encontrado`);
    }
    const home = await this.teamRepo.findOne({ where: { id: dto.homeTeamId } });
    if (!home) {
      throw new NotFoundException(
        `Equipo local ${dto.homeTeamId} no encontrado`,
      );
    }
    const away = await this.teamRepo.findOne({ where: { id: dto.awayTeamId } });
    if (!away) {
      throw new NotFoundException(
        `Equipo visitante ${dto.awayTeamId} no encontrado`,
      );
    }

    if (dto.refereeId) {
      const referee = await this.userRepo.findOne({
        where: { id: dto.refereeId },
      });
      if (!referee) {
        throw new NotFoundException(`Árbitro ${dto.refereeId} no encontrado`);
      }
      if (
        referee.role !== UserRole.REFEREE &&
        referee.role !== UserRole.ADMIN
      ) {
        throw new BadRequestException(
          'El usuario asignado no tiene rol de árbitro',
        );
      }
    }

    const match = this.matchRepo.create({
      stageId: dto.stageId,
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      refereeId: dto.refereeId ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      venue: dto.venue ?? null,
    });
    const saved = await this.matchRepo.save(match);

    const placeholder = this.resultRepo.create({
      matchId: saved.id,
      homeScore: 0,
      awayScore: 0,
      status: MatchResultStatus.PENDING,
    });
    await this.resultRepo.save(placeholder);

    return saved;
  }

  async findOne(id: string): Promise<Match> {
    const match = await this.matchRepo.findOne({
      where: { id },
      relations: { stage: true, homeTeam: true, awayTeam: true, referee: true },
    });
    if (!match) {
      throw new NotFoundException(`Partido ${id} no encontrado`);
    }
    if (match.referee) {
      delete (match.referee as Partial<User>).password;
    }
    return match;
  }

  async findAll(tournamentId?: string): Promise<Match[]> {
    const qb = this.matchRepo
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.stage', 'stage')
      .leftJoinAndSelect('match.homeTeam', 'homeTeam')
      .leftJoinAndSelect('match.awayTeam', 'awayTeam')
      .leftJoinAndSelect('match.referee', 'referee')
      .orderBy('match.scheduledAt', 'ASC');

    if (tournamentId) {
      qb.andWhere('stage.tournament_id = :tournamentId', { tournamentId });
    }
    return qb.getMany();
  }

  async updateResult(
    matchId: string,
    dto: UpdateMatchResultDto,
  ): Promise<MatchResult> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException(`Partido ${matchId} no encontrado`);
    }

    let result = await this.resultRepo.findOne({ where: { matchId } });
    if (!result) {
      result = this.resultRepo.create({ matchId });
    }

    result.homeScore = dto.homeScore;
    result.awayScore = dto.awayScore;
    result.status = dto.status ?? MatchResultStatus.PLAYED;

    return this.resultRepo.save(result);
  }

  async getLive(matchId: string): Promise<LiveMatchDto> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: { homeTeam: true, awayTeam: true },
    });
    if (!match) {
      throw new NotFoundException(`Partido ${matchId} no encontrado`);
    }

    const result = await this.resultRepo.findOne({ where: { matchId } });

    const events = await this.matchEventModel
      .find({ matchId })
      .sort({ minute: 1, createdAt: 1 })
      .lean()
      .exec();

    // Resolver nombres de jugador y equipo en lote para el timeline.
    const playerIds = [...new Set(events.map((e) => e.playerId))];
    const teamIds = [...new Set(events.map((e) => e.teamId))];

    const players = playerIds.length
      ? await this.userRepo.find({ where: { id: In(playerIds) } })
      : [];
    const teams = teamIds.length
      ? await this.teamRepo.find({ where: { id: In(teamIds) } })
      : [];

    const playerName = new Map(players.map((p) => [p.id, p.name]));
    const teamName = new Map(teams.map((t) => [t.id, t.name]));

    return {
      matchId: match.id,
      homeTeamName: match.homeTeam?.name ?? null,
      awayTeamName: match.awayTeam?.name ?? null,
      result: result
        ? {
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            status: result.status,
          }
        : null,
      events: events.map((e) => ({
        _id: String(e._id),
        type: e.type,
        minute: e.minute,
        playerName: playerName.get(e.playerId) ?? e.playerId,
        teamName: teamName.get(e.teamId) ?? e.teamId,
        description: e.description ?? null,
      })),
    };
  }
}
