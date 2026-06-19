import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { AddTeamToTournamentDto } from './dto/add-team-to-tournament.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Stage } from './entities/stage.entity';
import { TeamMember, TeamMemberRole } from './entities/team-member.entity';
import { Team } from './entities/team.entity';
import { TournamentTeam } from './entities/tournament-team.entity';
import { Tournament } from './entities/tournament.entity';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepo: Repository<Tournament>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TournamentTeam)
    private readonly tournamentTeamRepo: Repository<TournamentTeam>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
    @InjectRepository(Stage)
    private readonly stageRepo: Repository<Stage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ---------- Tournaments ----------

  findAllTournaments(): Promise<Tournament[]> {
    return this.tournamentRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findTournament(id: string): Promise<Tournament> {
    const tournament = await this.tournamentRepo.findOne({ where: { id } });
    if (!tournament) {
      throw new NotFoundException(`Torneo ${id} no encontrado`);
    }
    return tournament;
  }

  createTournament(dto: CreateTournamentDto): Promise<Tournament> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) {
      throw new BadRequestException(
        'endDate no puede ser anterior a startDate',
      );
    }
    const tournament = this.tournamentRepo.create({
      name: dto.name,
      sport: dto.sport ?? 'football',
      startDate: start,
      endDate: end,
      format: dto.format,
      ...(dto.status ? { status: dto.status } : {}),
    });
    return this.tournamentRepo.save(tournament);
  }

  async updateTournament(
    id: string,
    dto: UpdateTournamentDto,
  ): Promise<Tournament> {
    const tournament = await this.findTournament(id);
    if (dto.name !== undefined) tournament.name = dto.name;
    if (dto.sport !== undefined) tournament.sport = dto.sport;
    if (dto.startDate !== undefined)
      tournament.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) tournament.endDate = new Date(dto.endDate);
    if (dto.format !== undefined) tournament.format = dto.format;
    if (dto.status !== undefined) tournament.status = dto.status;
    if (tournament.endDate < tournament.startDate) {
      throw new BadRequestException(
        'endDate no puede ser anterior a startDate',
      );
    }
    return this.tournamentRepo.save(tournament);
  }

  async removeTournament(id: string): Promise<void> {
    const tournament = await this.findTournament(id);
    await this.tournamentRepo.remove(tournament);
  }

  async addTeamToTournament(
    tournamentId: string,
    dto: AddTeamToTournamentDto,
  ): Promise<TournamentTeam> {
    await this.findTournament(tournamentId);
    const team = await this.teamRepo.findOne({ where: { id: dto.teamId } });
    if (!team) {
      throw new NotFoundException(`Equipo ${dto.teamId} no encontrado`);
    }
    const existing = await this.tournamentTeamRepo.findOne({
      where: { tournamentId, teamId: dto.teamId },
    });
    if (existing) {
      throw new ConflictException('El equipo ya está inscrito en este torneo');
    }
    const registration = this.tournamentTeamRepo.create({
      tournamentId,
      teamId: dto.teamId,
    });
    return this.tournamentTeamRepo.save(registration);
  }

  async findTournamentTeams(tournamentId: string): Promise<TournamentTeam[]> {
    await this.findTournament(tournamentId);
    return this.tournamentTeamRepo.find({
      where: { tournamentId },
      relations: { team: true },
      order: { registeredAt: 'ASC' },
    });
  }

  // ---------- Teams ----------

  findAllTeams(): Promise<Team[]> {
    return this.teamRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findTeam(id: string): Promise<Team> {
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Equipo ${id} no encontrado`);
    }
    return team;
  }

  createTeam(dto: CreateTeamDto): Promise<Team> {
    const team = this.teamRepo.create({
      name: dto.name,
      logoUrl: dto.logoUrl ?? null,
      description: dto.description ?? null,
    });
    return this.teamRepo.save(team);
  }

  // ---------- Stages ----------

  async createStage(tournamentId: string, dto: CreateStageDto): Promise<Stage> {
    await this.findTournament(tournamentId);
    const existing = await this.stageRepo.findOne({
      where: { tournamentId, order: dto.order },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una fase con order=${dto.order} en este torneo`,
      );
    }
    const stage = this.stageRepo.create({
      tournamentId,
      name: dto.name,
      type: dto.type,
      order: dto.order,
    });
    return this.stageRepo.save(stage);
  }

  async findStages(tournamentId: string): Promise<Stage[]> {
    await this.findTournament(tournamentId);
    return this.stageRepo.find({
      where: { tournamentId },
      order: { order: 'ASC' },
    });
  }

  async findTeamMembers(teamId: string): Promise<TeamMember[]> {
    await this.findTeam(teamId);
    const members = await this.teamMemberRepo.find({
      where: { teamId },
      relations: { user: true },
      order: { jerseyNumber: 'ASC' },
    });
    // No exponer el hash de contraseña en la plantilla.
    for (const m of members) {
      if (m.user) delete (m.user as Partial<User>).password;
    }
    return members;
  }

  async addTeamMember(
    teamId: string,
    dto: AddTeamMemberDto,
  ): Promise<TeamMember> {
    await this.findTeam(teamId);
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`Usuario ${dto.userId} no encontrado`);
    }
    const existing = await this.teamMemberRepo.findOne({
      where: { teamId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException('Este usuario ya pertenece al equipo');
    }
    const member = this.teamMemberRepo.create({
      teamId,
      userId: dto.userId,
      jerseyNumber: dto.jerseyNumber ?? null,
      role: dto.role ?? TeamMemberRole.PLAYER,
    });
    return this.teamMemberRepo.save(member);
  }
}
