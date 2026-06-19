import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Stage } from './entities/stage.entity';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';
import { TournamentTeam } from './entities/tournament-team.entity';
import { Tournament, TournamentFormat } from './entities/tournament.entity';
import { TournamentsService } from './tournaments.service';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

const makeRepo = (): RepoMock => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((x: unknown) => x),
  save: jest.fn((x: unknown) => x),
  remove: jest.fn(),
});

describe('TournamentsService', () => {
  let service: TournamentsService;
  let tournamentRepo: RepoMock;
  let teamRepo: RepoMock;
  let tournamentTeamRepo: RepoMock;

  beforeEach(async () => {
    // Arrange (común): repos mockeados, frescos por test.
    tournamentRepo = makeRepo();
    teamRepo = makeRepo();
    tournamentTeamRepo = makeRepo();

    const moduleRef = await Test.createTestingModule({
      providers: [
        TournamentsService,
        { provide: getRepositoryToken(Tournament), useValue: tournamentRepo },
        { provide: getRepositoryToken(Team), useValue: teamRepo },
        {
          provide: getRepositoryToken(TournamentTeam),
          useValue: tournamentTeamRepo,
        },
        { provide: getRepositoryToken(TeamMember), useValue: makeRepo() },
        { provide: getRepositoryToken(Stage), useValue: makeRepo() },
        { provide: getRepositoryToken(User), useValue: makeRepo() },
      ],
    }).compile();

    service = moduleRef.get(TournamentsService);
  });

  describe('createTournament', () => {
    describe('cuando la fecha de fin es anterior a la de inicio', () => {
      it('lanza BadRequestException', () => {
        // Arrange
        const dto = {
          name: 'Copa',
          format: TournamentFormat.LEAGUE,
          startDate: '2026-12-01',
          endDate: '2026-01-01',
        };
        // Act + Assert (la validación lanza de forma síncrona)
        expect(() => service.createTournament(dto)).toThrow(
          BadRequestException,
        );
      });
    });

    describe('cuando no se indica el deporte', () => {
      it('usa "football" por defecto', async () => {
        // Arrange
        const dto = {
          name: 'Copa',
          format: TournamentFormat.LEAGUE,
          startDate: '2026-01-01',
          endDate: '2026-06-01',
        };
        // Act
        await service.createTournament(dto);
        // Assert
        expect(tournamentRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ sport: 'football' }),
        );
      });
    });
  });

  describe('findTournament', () => {
    describe('cuando el torneo no existe', () => {
      it('lanza NotFoundException', async () => {
        // Arrange
        tournamentRepo.findOne.mockResolvedValue(null);
        // Act + Assert
        await expect(
          service.findTournament('no-existe'),
        ).rejects.toBeInstanceOf(NotFoundException);
      });
    });
  });

  describe('addTeamToTournament', () => {
    describe('cuando el equipo ya está inscrito', () => {
      it('lanza ConflictException', async () => {
        // Arrange
        tournamentRepo.findOne.mockResolvedValue({ id: 't1' });
        teamRepo.findOne.mockResolvedValue({ id: 'eq1' });
        tournamentTeamRepo.findOne.mockResolvedValue({ id: 'reg1' });
        // Act + Assert
        await expect(
          service.addTeamToTournament('t1', { teamId: 'eq1' }),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });
  });
});
