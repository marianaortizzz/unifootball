import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from './../src/auth/entities/user.entity';
import { Team } from './../src/tournaments/entities/team.entity';
import { TournamentTeam } from './../src/tournaments/entities/tournament-team.entity';
import {
  Tournament,
  TournamentFormat,
  TournamentStatus,
} from './../src/tournaments/entities/tournament.entity';

// TC-DBSQL-001..006 — Pruebas de la base de datos RELACIONAL (Postgres).
//
// Estas pruebas SÍ usan una base de datos real (el Postgres local en el
// contenedor uf-postgres, puerto 5433). Se ejecutan con TypeORM directamente
// para validar el esquema, las restricciones (constraints) y las relaciones.
//
// Aislamiento: cada caso crea sus propios registros con identificadores únicos
// y los borra en afterEach, de modo que las pruebas son deterministas y no
// dependen entre sí ni ensucian los datos del seed.

// El código de error de Postgres viaja en error.driverError.code.
interface PgDriverError {
  code?: string;
}
function pgErrorCode(err: unknown): string | undefined {
  return (err as { driverError?: PgDriverError }).driverError?.code;
}

describe('Base de datos relacional (Postgres, e2e)', () => {
  let dataSource: DataSource;
  let userRepo: Repository<User>;
  let tournamentRepo: Repository<Tournament>;
  let teamRepo: Repository<Team>;
  let tournamentTeamRepo: Repository<TournamentTeam>;

  // Registros creados en cada test para limpiarlos después (orden: hijos→padres).
  let createdTournamentTeamIds: string[];
  let createdTournamentIds: string[];
  let createdTeamIds: string[];
  let createdUserIds: string[];

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5433/unifootball',
      // Cargamos todas las entidades del proyecto desde el código fuente.
      entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
      synchronize: false, // el esquema ya existe; no lo alteramos desde el test
      ssl: false, // Postgres local sin TLS
    });
    await dataSource.initialize();
    userRepo = dataSource.getRepository(User);
    tournamentRepo = dataSource.getRepository(Tournament);
    teamRepo = dataSource.getRepository(Team);
    tournamentTeamRepo = dataSource.getRepository(TournamentTeam);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(() => {
    createdTournamentTeamIds = [];
    createdTournamentIds = [];
    createdTeamIds = [];
    createdUserIds = [];
  });

  afterEach(async () => {
    if (createdTournamentTeamIds.length)
      await tournamentTeamRepo.delete(createdTournamentTeamIds);
    if (createdTournamentIds.length)
      await tournamentRepo.delete(createdTournamentIds);
    if (createdTeamIds.length) await teamRepo.delete(createdTeamIds);
    if (createdUserIds.length) await userRepo.delete(createdUserIds);
  });

  // ---------- Conexión ----------

  it('la conexión a Postgres está activa', () => {
    expect(dataSource.isInitialized).toBe(true);
  });

  // ---------- CRUD por repositorio ----------

  it('CRUD completo de Tournament: crear, leer, actualizar y borrar', async () => {
    // CREATE
    const creado = await tournamentRepo.save(
      tournamentRepo.create({
        name: `Torneo CRUD ${randomUUID().slice(0, 8)}`,
        sport: 'football',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-12-15'),
        format: TournamentFormat.LEAGUE,
      }),
    );
    createdTournamentIds.push(creado.id);
    expect(creado.id).toBeDefined();
    expect(creado.status).toBe(TournamentStatus.DRAFT); // default del esquema

    // READ
    const leido = await tournamentRepo.findOne({ where: { id: creado.id } });
    expect(leido).not.toBeNull();
    expect(leido?.name).toBe(creado.name);

    // UPDATE
    await tournamentRepo.update(creado.id, {
      status: TournamentStatus.ACTIVE,
    });
    const actualizado = await tournamentRepo.findOne({
      where: { id: creado.id },
    });
    expect(actualizado?.status).toBe(TournamentStatus.ACTIVE);

    // DELETE
    await tournamentRepo.delete(creado.id);
    const borrado = await tournamentRepo.findOne({ where: { id: creado.id } });
    expect(borrado).toBeNull();
    createdTournamentIds = []; // ya borrado, no limpiar de nuevo
  });

  // ---------- Restricción UNIQUE ----------

  it('rechaza un email duplicado (UNIQUE en users.email)', async () => {
    const email = `e2e-${randomUUID()}@test.local`;
    const primero = await userRepo.save(
      userRepo.create({
        email,
        name: 'Usuario Único',
        password: 'hash-de-prueba',
        role: UserRole.PLAYER,
      }),
    );
    createdUserIds.push(primero.id);

    // Insertar otro usuario con el MISMO email debe violar la restricción.
    expect.assertions(2);
    try {
      await userRepo.save(
        userRepo.create({
          email,
          name: 'Usuario Repetido',
          password: 'otro-hash',
          role: UserRole.PLAYER,
        }),
      );
    } catch (err) {
      expect(err).toBeDefined();
      // 23505 = unique_violation en Postgres
      expect(pgErrorCode(err)).toBe('23505');
    }
  });

  it('rechaza inscribir dos veces el mismo equipo en el torneo (UNIQUE compuesto)', async () => {
    const tournament = await tournamentRepo.save(
      tournamentRepo.create({
        name: `Torneo UQ ${randomUUID().slice(0, 8)}`,
        sport: 'football',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-12-15'),
        format: TournamentFormat.LEAGUE,
      }),
    );
    createdTournamentIds.push(tournament.id);

    const team = await teamRepo.save(
      teamRepo.create({ name: `Equipo UQ ${randomUUID().slice(0, 8)}` }),
    );
    createdTeamIds.push(team.id);

    const reg = await tournamentTeamRepo.save(
      tournamentTeamRepo.create({
        tournamentId: tournament.id,
        teamId: team.id,
      }),
    );
    createdTournamentTeamIds.push(reg.id);

    // Segunda inscripción idéntica -> viola @Unique(['tournamentId','teamId']).
    expect.assertions(1);
    try {
      await tournamentTeamRepo.save(
        tournamentTeamRepo.create({
          tournamentId: tournament.id,
          teamId: team.id,
        }),
      );
    } catch (err) {
      expect(pgErrorCode(err)).toBe('23505');
    }
  });

  // ---------- Restricción de llave foránea ----------

  it('rechaza una inscripción con torneo/equipo inexistente (FOREIGN KEY)', async () => {
    expect.assertions(1);
    try {
      await tournamentTeamRepo.save(
        tournamentTeamRepo.create({
          tournamentId: randomUUID(), // no existe
          teamId: randomUUID(), // no existe
        }),
      );
    } catch (err) {
      // 23503 = foreign_key_violation en Postgres
      expect(pgErrorCode(err)).toBe('23503');
    }
  });

  // ---------- Carga de relaciones (JOIN) ----------

  it('carga las relaciones tournament y team de una inscripción (JOIN)', async () => {
    const tournament = await tournamentRepo.save(
      tournamentRepo.create({
        name: `Torneo JOIN ${randomUUID().slice(0, 8)}`,
        sport: 'football',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-12-15'),
        format: TournamentFormat.LEAGUE,
      }),
    );
    createdTournamentIds.push(tournament.id);

    const team = await teamRepo.save(
      teamRepo.create({ name: `Equipo JOIN ${randomUUID().slice(0, 8)}` }),
    );
    createdTeamIds.push(team.id);

    const reg = await tournamentTeamRepo.save(
      tournamentTeamRepo.create({
        tournamentId: tournament.id,
        teamId: team.id,
      }),
    );
    createdTournamentTeamIds.push(reg.id);

    const conRelaciones = await tournamentTeamRepo.findOne({
      where: { id: reg.id },
      relations: { tournament: true, team: true },
    });

    expect(conRelaciones?.tournament.id).toBe(tournament.id);
    expect(conRelaciones?.team.name).toBe(team.name);
  });

  // ---------- Datos del seed (lectura) ----------

  it('el seed dejó usuarios cargados en la base', async () => {
    const total = await userRepo.count();
    expect(total).toBeGreaterThan(0);
  });
});
