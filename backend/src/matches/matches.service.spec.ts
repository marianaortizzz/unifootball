import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { MatchEvent } from '../mongo/schemas/match-event.schema';
import { Stage } from '../tournaments/entities/stage.entity';
import { Team } from '../tournaments/entities/team.entity';
import { MatchResult, MatchResultStatus } from './entities/match-result.entity';
import { Match } from './entities/match.entity';
import { MatchesService } from './matches.service';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

const makeRepo = (): RepoMock => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((x: unknown) => x),
  save: jest.fn((x: unknown) => x),
});

describe('MatchesService', () => {
  let service: MatchesService;
  let matchRepo: RepoMock;
  let resultRepo: RepoMock;
  let stageRepo: RepoMock;
  let teamRepo: RepoMock;
  let userRepo: RepoMock;

  beforeEach(async () => {
    // Arrange (común): repos mockeados, frescos por test.
    matchRepo = makeRepo();
    resultRepo = makeRepo();
    stageRepo = makeRepo();
    teamRepo = makeRepo();
    userRepo = makeRepo();

    const moduleRef = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: getRepositoryToken(Match), useValue: matchRepo },
        { provide: getRepositoryToken(MatchResult), useValue: resultRepo },
        { provide: getRepositoryToken(Stage), useValue: stageRepo },
        { provide: getRepositoryToken(Team), useValue: teamRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getModelToken(MatchEvent.name), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(MatchesService);
  });

  describe('create', () => {
    describe('cuando el local y el visitante son el mismo equipo (TC-UNIT-013)', () => {
      it('lanza BadRequestException', async () => {
        // Act + Assert
        await expect(
          service.create({
            stageId: 's1',
            homeTeamId: 'mismo',
            awayTeamId: 'mismo',
            scheduledAt: '2026-05-01T16:00:00Z',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    describe('cuando el árbitro asignado tiene rol PLAYER (TC-UNIT-014)', () => {
      it('lanza BadRequestException', async () => {
        // Arrange
        stageRepo.findOne.mockResolvedValue({ id: 's1' });
        teamRepo.findOne.mockResolvedValue({ id: 'team' });
        userRepo.findOne.mockResolvedValue({ id: 'r1', role: UserRole.PLAYER });
        // Act + Assert
        await expect(
          service.create({
            stageId: 's1',
            homeTeamId: 'home',
            awayTeamId: 'away',
            refereeId: 'r1',
            scheduledAt: '2026-05-01T16:00:00Z',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });
  });

  describe('updateResult (TC-UNIT-015)', () => {
    describe('cuando no se especifica el status', () => {
      it('guarda el resultado con status PLAYED por defecto', async () => {
        // Arrange
        matchRepo.findOne.mockResolvedValue({ id: 'm1' });
        resultRepo.findOne.mockResolvedValue({ matchId: 'm1' });
        // Act
        const result = await service.updateResult('m1', {
          homeScore: 2,
          awayScore: 1,
        });
        // Assert
        expect(result.status).toBe(MatchResultStatus.PLAYED);
      });
    });
  });
});
