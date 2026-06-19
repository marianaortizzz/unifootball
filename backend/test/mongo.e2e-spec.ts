import { INestApplication } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import {
  ActivityFeed,
  ActivityFeedSchema,
} from './../src/mongo/schemas/activity-feed.schema';
import {
  MatchEvent,
  MatchEventSchema,
  MatchEventType,
} from './../src/mongo/schemas/match-event.schema';
import {
  Notification,
  NotificationSchema,
} from './../src/mongo/schemas/notification.schema';

// TC-DBNOSQL-001..005 — Pruebas de la base de datos NoSQL (MongoDB / Mongoose).
//
// Usan el MongoDB local real (contenedor docker uf-mongo, puerto 27018).
// Validan: conexión, CRUD de documentos, validación de esquema (campos
// requeridos y enums), valores por defecto, índices y limpieza de colección.
//
// Aislamiento: todos los documentos de prueba se insertan con un identificador
// marcado con el prefijo "e2e-" y se borran en afterEach, así no se mezclan con
// los datos del seed ni quedan colecciones sucias.

const MARK = 'e2e-test';

describe('Base de datos NoSQL (MongoDB, e2e)', () => {
  let app: INestApplication;
  let matchEventModel: Model<MatchEvent>;
  let activityFeedModel: Model<ActivityFeed>;
  let notificationModel: Model<Notification>;

  beforeAll(async () => {
    const uri =
      process.env.MONGODB_URI ?? 'mongodb://localhost:27018/unifootball';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: MatchEvent.name, schema: MatchEventSchema },
          { name: ActivityFeed.name, schema: ActivityFeedSchema },
          { name: Notification.name, schema: NotificationSchema },
        ]),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init(); // establece la conexión a Mongo

    matchEventModel = moduleRef.get<Model<MatchEvent>>(
      getModelToken(MatchEvent.name),
    );
    activityFeedModel = moduleRef.get<Model<ActivityFeed>>(
      getModelToken(ActivityFeed.name),
    );
    notificationModel = moduleRef.get<Model<Notification>>(
      getModelToken(Notification.name),
    );
  });

  afterEach(async () => {
    // Borra solo lo que crearon las pruebas (marcado con el prefijo e2e-).
    await matchEventModel.deleteMany({ matchId: new RegExp(`^${MARK}`) });
    await activityFeedModel.deleteMany({
      tournamentId: new RegExp(`^${MARK}`),
    });
    await notificationModel.deleteMany({ userId: new RegExp(`^${MARK}`) });
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------- Conexión ----------

  it('la conexión a MongoDB está activa', () => {
    expect(matchEventModel.db.readyState).toBe(1); // 1 = connected
  });

  // ---------- CRUD de documento ----------

  it('CRUD de un evento de partido: crear, leer, actualizar y borrar', async () => {
    // CREATE
    const creado = await matchEventModel.create({
      matchId: `${MARK}-match-1`,
      type: MatchEventType.GOAL,
      minute: 23,
      playerId: 'player-10',
      teamId: 'team-A',
      description: 'Gol de cabeza',
    });
    expect(creado._id).toBeDefined();
    expect(creado.createdAt).toBeInstanceOf(Date); // default aplicado

    // READ
    const leido = await matchEventModel.findById(creado._id).lean();
    expect(leido?.type).toBe(MatchEventType.GOAL);
    expect(leido?.minute).toBe(23);

    // UPDATE
    await matchEventModel.updateOne({ _id: creado._id }, { minute: 24 });
    const actualizado = await matchEventModel.findById(creado._id).lean();
    expect(actualizado?.minute).toBe(24);

    // DELETE
    await matchEventModel.deleteOne({ _id: creado._id });
    const borrado = await matchEventModel.findById(creado._id).lean();
    expect(borrado).toBeNull();
  });

  // ---------- Validación de esquema: campos requeridos ----------

  it('rechaza un evento sin los campos requeridos (validación de esquema)', async () => {
    expect.assertions(2);
    try {
      // Faltan playerId y teamId (ambos required).
      await matchEventModel.create({
        matchId: `${MARK}-match-2`,
        type: MatchEventType.GOAL,
        minute: 10,
      });
    } catch (err) {
      expect(err).toBeDefined();
      expect((err as Error).name).toBe('ValidationError');
    }
  });

  // ---------- Validación de esquema: enum ----------

  it('rechaza un evento con un tipo fuera del enum permitido', async () => {
    expect.assertions(1);
    try {
      await matchEventModel.create({
        matchId: `${MARK}-match-3`,
        type: 'penalti_inventado' as unknown as MatchEventType, // inválido a propósito: no está en MatchEventType
        minute: 10,
        playerId: 'player-7',
        teamId: 'team-B',
      });
    } catch (err) {
      expect((err as Error).name).toBe('ValidationError');
    }
  });

  // ---------- Valores por defecto ----------

  it('aplica los valores por defecto de una notificación (read=false, createdAt)', async () => {
    const noti = await notificationModel.create({
      userId: `${MARK}-user-1`,
      title: 'Tu equipo juega hoy',
      body: 'El partido empieza a las 18:00',
    });

    expect(noti.read).toBe(false); // default
    expect(noti.createdAt).toBeInstanceOf(Date); // default
  });

  // ---------- Índices definidos en el esquema ----------

  it('el esquema de match_events declara un índice en matchId', () => {
    const indices = JSON.stringify(MatchEventSchema.indexes());
    expect(indices).toContain('matchId');
  });

  // ---------- Limpieza de colección (aislamiento) ----------

  it('deleteMany deja la colección de prueba sin documentos marcados', async () => {
    await activityFeedModel.create([
      {
        tournamentId: `${MARK}-tour-1`,
        type: 'match_result',
        title: 'Resultado',
        description: 'Equipo A 2 - 1 Equipo B',
      },
      {
        tournamentId: `${MARK}-tour-1`,
        type: 'match_result',
        title: 'Resultado',
        description: 'Equipo C 0 - 0 Equipo D',
      },
    ]);

    const antes = await activityFeedModel.countDocuments({
      tournamentId: `${MARK}-tour-1`,
    });
    expect(antes).toBe(2);

    await activityFeedModel.deleteMany({ tournamentId: `${MARK}-tour-1` });

    const despues = await activityFeedModel.countDocuments({
      tournamentId: `${MARK}-tour-1`,
    });
    expect(despues).toBe(0);
  });
});
