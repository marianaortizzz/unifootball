import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity';
import {
  MatchEvent,
  MatchEventType,
} from '../mongo/schemas/match-event.schema';
import { TournamentTeam } from '../tournaments/entities/tournament-team.entity';
import { PlayerStats } from './entities/player-stats.entity';
import { Standing } from './entities/standing.entity';
import { StatsService } from './stats.service';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const makeRepo = (): RepoMock => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((x: unknown) => x),
  save: jest.fn((x: unknown) => x),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const statRow = (goals: number, assists: number, minutes: number) => ({
  goals,
  assists,
  yellowCards: 0,
  redCards: 0,
  minutesPlayed: minutes,
});

// Partido jugado con su resultado embebido (como lo mapea recalculateStandings).
const playedMatch = (
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
) => ({ homeTeamId, awayTeamId, result: { homeScore, awayScore } });

const standingOf = (rows: Standing[], teamId: string): Standing =>
  rows.find((s) => s.teamId === teamId) as Standing;

describe('StatsService', () => {
  let service: StatsService;
  let playerStatsRepo: RepoMock;
  let standingRepo: RepoMock;
  let matchRepo: RepoMock;
  let tournamentTeamRepo: RepoMock;
  let matchEventModel: { create: jest.Mock };

  beforeEach(async () => {
    // Arrange (común): repos mockeados, frescos por test.
    playerStatsRepo = makeRepo();
    standingRepo = makeRepo();
    matchRepo = makeRepo();
    tournamentTeamRepo = makeRepo();
    matchEventModel = { create: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: getRepositoryToken(PlayerStats), useValue: playerStatsRepo },
        { provide: getRepositoryToken(Standing), useValue: standingRepo },
        { provide: getRepositoryToken(Match), useValue: matchRepo },
        {
          provide: getRepositoryToken(TournamentTeam),
          useValue: tournamentTeamRepo,
        },
        { provide: getModelToken(MatchEvent.name), useValue: matchEventModel },
      ],
    }).compile();

    service = moduleRef.get(StatsService);
  });

  describe('getPlayerTotals (TC-UNIT-004)', () => {
    describe('cuando el jugador tiene varias filas de estadísticas', () => {
      beforeEach(() => {
        // Arrange
        playerStatsRepo.find.mockResolvedValue([
          statRow(2, 1, 90),
          statRow(3, 0, 80),
        ]);
      });

      it('suma los goles de todas las filas', async () => {
        const totals = await service.getPlayerTotals('p1');
        expect(totals.goals).toBe(5);
      });

      it('suma los minutos jugados de todas las filas', async () => {
        const totals = await service.getPlayerTotals('p1');
        expect(totals.minutesPlayed).toBe(170);
      });

      it('cuenta los partidos jugados como el número de filas', async () => {
        const totals = await service.getPlayerTotals('p1');
        expect(totals.matchesPlayed).toBe(2);
      });
    });

    describe('cuando el jugador no tiene estadísticas', () => {
      it('devuelve los totales en cero', async () => {
        // Arrange
        playerStatsRepo.find.mockResolvedValue([]);
        // Act
        const totals = await service.getPlayerTotals('p1');
        // Assert
        expect(totals.goals).toBe(0);
      });
    });
  });

  describe('upsertPlayerStats (TC-UNIT-005 / 006)', () => {
    describe('cuando el partido no existe (TC-UNIT-006)', () => {
      it('lanza NotFoundException', async () => {
        // Arrange
        matchRepo.findOne.mockResolvedValue(null);
        // Act + Assert
        await expect(
          service.upsertPlayerStats({ matchId: 'no-existe', userId: 'p1' }),
        ).rejects.toBeInstanceOf(NotFoundException);
      });
    });

    describe('cuando no existe un registro previo (TC-UNIT-005)', () => {
      it('crea uno nuevo con los valores del dto', async () => {
        // Arrange
        matchRepo.findOne.mockResolvedValue({ id: 'm1' });
        playerStatsRepo.findOne.mockResolvedValue(null);
        playerStatsRepo.create.mockReturnValue({ matchId: 'm1', userId: 'p1' });
        // Act
        const row = await service.upsertPlayerStats({
          matchId: 'm1',
          userId: 'p1',
          goals: 4,
        });
        // Assert
        expect(row.goals).toBe(4);
      });
    });

    describe('cuando ya existe un registro (TC-UNIT-005)', () => {
      it('actualiza los valores del registro existente', async () => {
        // Arrange
        matchRepo.findOne.mockResolvedValue({ id: 'm1' });
        playerStatsRepo.findOne.mockResolvedValue({
          matchId: 'm1',
          userId: 'p1',
          goals: 0,
        });
        // Act
        const row = await service.upsertPlayerStats({
          matchId: 'm1',
          userId: 'p1',
          goals: 7,
        });
        // Assert
        expect(row.goals).toBe(7);
      });
    });
  });

  describe('recalculateStandings (TC-UNIT-001 / 002 / 003)', () => {
    const mockQueryBuilder = (rows: unknown[]) => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndMapOne: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(rows),
      };
      matchRepo.createQueryBuilder.mockReturnValue(qb);
    };

    describe('cuando no hay equipos inscritos (TC-UNIT-003)', () => {
      it('lanza NotFoundException', async () => {
        // Arrange
        tournamentTeamRepo.find.mockResolvedValue([]);
        // Act + Assert
        await expect(service.recalculateStandings('t1')).rejects.toBeInstanceOf(
          NotFoundException,
        );
      });
    });

    describe('cuando hay partidos jugados (TC-UNIT-001)', () => {
      it('asigna 3 puntos al ganador (victoria local 2-1)', async () => {
        // Arrange
        tournamentTeamRepo.find.mockResolvedValue([
          { teamId: 'A' },
          { teamId: 'B' },
        ]);
        mockQueryBuilder([playedMatch('A', 'B', 2, 1)]);
        // Act
        const table = await service.recalculateStandings('t1');
        // Assert
        expect(standingOf(table, 'A').points).toBe(3);
      });

      it('asigna 1 punto a cada equipo en un empate (1-1)', async () => {
        // Arrange
        tournamentTeamRepo.find.mockResolvedValue([
          { teamId: 'A' },
          { teamId: 'B' },
        ]);
        mockQueryBuilder([playedMatch('A', 'B', 1, 1)]);
        // Act
        const table = await service.recalculateStandings('t1');
        // Assert
        expect(standingOf(table, 'B').points).toBe(1);
      });
    });

    describe('ordenamiento de la tabla (TC-UNIT-002)', () => {
      it('a igualdad de puntos, ordena primero por diferencia de goles', async () => {
        // Arrange: A y B terminan con 3 pts cada uno, pero A tiene mejor DG.
        tournamentTeamRepo.find.mockResolvedValue([
          { teamId: 'A' },
          { teamId: 'B' },
        ]);
        mockQueryBuilder([
          playedMatch('A', 'B', 5, 0), // gana A
          playedMatch('B', 'A', 1, 0), // gana B
        ]);
        // Act
        const table = await service.recalculateStandings('t1');
        // Assert: A (DG +4) va por delante de B (DG -4)
        expect(table[0].teamId).toBe('A');
      });
    });
  });

  describe('createMatchEvent (TC-UNIT-017)', () => {
    it('persiste el evento con todos los campos requeridos', async () => {
      // Arrange
      matchEventModel.create.mockResolvedValue({
        toObject: () => ({ matchId: 'm1', type: MatchEventType.GOAL }),
      });
      // Act
      await service.createMatchEvent({
        matchId: 'm1',
        type: MatchEventType.GOAL,
        minute: 23,
        playerId: 'p1',
        teamId: 'A',
      });
      // Assert
      expect(matchEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: 'm1',
          type: MatchEventType.GOAL,
          minute: 23,
          playerId: 'p1',
          teamId: 'A',
        }),
      );
    });
  });
});
