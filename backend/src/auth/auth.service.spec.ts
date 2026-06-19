import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { BUSINESS_COUNTER } from '../metrics/metrics.constants';
import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';

// Aislamiento total: bcrypt (criptografía real) se mockea.
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let jwt: { sign: jest.Mock };
  let businessEvents: { inc: jest.Mock };

  beforeEach(async () => {
    // Arrange (común): mocks frescos en cada test -> tests independientes.
    jest.clearAllMocks();
    userRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed-jwt') };
    businessEvents = { inc: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwt },
        { provide: BUSINESS_COUNTER, useValue: businessEvents },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    describe('cuando el email ya está registrado', () => {
      it('lanza ConflictException', async () => {
        // Arrange
        userRepo.findOne.mockResolvedValue({ id: 'u1' });
        // Act + Assert
        await expect(
          service.register({
            email: 'ana@uni.edu',
            name: 'Ana',
            password: 'Password123',
          }),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });

    describe('cuando el email es nuevo', () => {
      beforeEach(() => {
        // Arrange: no hay usuario previo y el guardado devuelve el usuario.
        userRepo.findOne.mockResolvedValue(null);
        const saved = {
          id: 'u2',
          email: 'ana@uni.edu',
          name: 'Ana',
          password: 'hash',
          role: UserRole.PLAYER,
        };
        userRepo.create.mockReturnValue(saved);
        userRepo.save.mockResolvedValue(saved);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      });

      it('hashea el password con bcrypt antes de persistir (TC-UNIT-010)', async () => {
        // Act
        await service.register({
          email: 'ana@uni.edu',
          name: 'Ana',
          password: 'Password123',
        });
        // Assert
        expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      });

      it('devuelve un accessToken firmado', async () => {
        // Act
        const res = await service.register({
          email: 'ana@uni.edu',
          name: 'Ana',
          password: 'Password123',
        });
        // Assert
        expect(res.accessToken).toBe('signed-jwt');
      });

      it('incrementa la métrica de negocio "registration"', async () => {
        // Act
        await service.register({
          email: 'ana@uni.edu',
          name: 'Ana',
          password: 'Password123',
        });
        // Assert
        expect(businessEvents.inc).toHaveBeenCalledWith({
          event: 'registration',
        });
      });
    });
  });

  describe('login', () => {
    describe('cuando el usuario no existe (TC-UNIT-011)', () => {
      it('lanza UnauthorizedException', async () => {
        // Arrange
        userRepo.findOne.mockResolvedValue(null);
        // Act + Assert
        await expect(
          service.login({ email: 'x@uni.edu', password: 'Password123' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      });
    });

    describe('cuando la contraseña es incorrecta', () => {
      it('lanza UnauthorizedException', async () => {
        // Arrange
        userRepo.findOne.mockResolvedValue({ id: 'u1', password: 'hash' });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        // Act + Assert
        await expect(
          service.login({ email: 'ana@uni.edu', password: 'incorrecta' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      });
    });

    describe('cuando las credenciales son válidas', () => {
      beforeEach(() => {
        // Arrange
        userRepo.findOne.mockResolvedValue({
          id: 'u1',
          email: 'ana@uni.edu',
          name: 'Ana',
          password: 'hash',
          role: UserRole.PLAYER,
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      });

      it('valida el password con bcrypt.compare, no en texto plano (TC-UNIT-007)', async () => {
        // Act
        await service.login({ email: 'ana@uni.edu', password: 'Password123' });
        // Assert: compara el texto recibido contra el HASH almacenado.
        expect(bcrypt.compare).toHaveBeenCalledWith('Password123', 'hash');
      });

      it('devuelve un accessToken firmado', async () => {
        // Act
        const res = await service.login({
          email: 'ana@uni.edu',
          password: 'Password123',
        });
        // Assert
        expect(res.accessToken).toBe('signed-jwt');
      });
    });
  });

  describe('listUsers (TC-UNIT-012)', () => {
    describe('cuando se pasa un rol', () => {
      it('filtra el find por ese rol', async () => {
        // Arrange
        userRepo.find.mockResolvedValue([]);
        // Act
        await service.listUsers(UserRole.PLAYER);
        // Assert
        expect(userRepo.find).toHaveBeenCalledWith(
          expect.objectContaining({ where: { role: UserRole.PLAYER } }),
        );
      });
    });
  });
});
