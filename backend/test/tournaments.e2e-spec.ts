import { randomUUID } from 'crypto';
import request from 'supertest';

// TC-API-0xx — Pruebas de integración de la API de torneos.
// Se ejecutan contra la API REAL CORRIENDO (caja negra, HTTP de verdad).
// Todas las rutas están protegidas con JWT: registramos un usuario por la
// propia API para obtener un token válido. Los torneos creados se borran al
// final con el DELETE de la API (limpieza por la misma caja negra).
// Requisitos:
//   1) docker start uf-postgres uf-mongo
//   2) cd backend && npm run start:dev   (API en http://localhost:3000)
const BASE_URL = process.env.API_URL ?? 'http://localhost:3000';

interface AuthBody {
  accessToken: string;
}
interface TournamentBody {
  id: string;
  name: string;
}

const validTournament = {
  name: 'Liga Universitaria 2026',
  sport: 'football',
  startDate: '2026-08-01',
  endDate: '2026-12-15',
  format: 'league',
};

describe('Tournaments API (e2e contra la API corriendo)', () => {
  let token: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const ping = await request(BASE_URL)
      .get('/')
      .catch(() => null);
    if (!ping || ping.status !== 200) {
      throw new Error(
        `La API no responde en ${BASE_URL}. Levántala con: cd backend && npm run start:dev`,
      );
    }

    const res = await request(BASE_URL)
      .post('/auth/register')
      .send({
        email: `e2e-${randomUUID()}@uni.edu`,
        name: 'Organizador',
        password: 'P@ssw0rd123',
      });
    token = (res.body as AuthBody).accessToken;
  });

  afterAll(async () => {
    // Limpieza: borra los torneos creados durante las pruebas.
    for (const id of createdIds) {
      await request(BASE_URL)
        .delete(`/tournaments/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .catch(() => null);
    }
  });

  it('GET /tournaments devuelve 401 sin token JWT', async () => {
    const res = await request(BASE_URL).get('/tournaments');
    expect(res.status).toBe(401);
  });

  it('POST /tournaments crea un torneo y devuelve 201 (happy path)', async () => {
    const res = await request(BASE_URL)
      .post('/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send(validTournament);

    expect(res.status).toBe(201);
    const body = res.body as TournamentBody;
    expect(body).toHaveProperty('id');
    expect(body.name).toBe('Liga Universitaria 2026');
    createdIds.push(body.id);
  });

  it('GET /tournaments/:id devuelve 200 con un torneo existente', async () => {
    const creado = await request(BASE_URL)
      .post('/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send(validTournament);
    const id = (creado.body as TournamentBody).id;
    createdIds.push(id);

    const res = await request(BASE_URL)
      .get(`/tournaments/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect((res.body as TournamentBody).id).toBe(id);
  });

  it('GET /tournaments/:id devuelve 404 si el torneo no existe', async () => {
    const res = await request(BASE_URL)
      .get(`/tournaments/${randomUUID()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('GET /tournaments/:id devuelve 400 si el id no es un UUID válido', async () => {
    const res = await request(BASE_URL)
      .get('/tournaments/no-es-uuid')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('POST /tournaments devuelve 400 con DTO inválido (faltan campos requeridos)', async () => {
    const res = await request(BASE_URL)
      .post('/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' }); // name muy corto y faltan fechas/formato
    expect(res.status).toBe(400);
  });

  it('POST /tournaments devuelve 400 si endDate es anterior a startDate (regla de negocio)', async () => {
    const res = await request(BASE_URL)
      .post('/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validTournament,
        startDate: '2026-12-15',
        endDate: '2026-08-01',
      });
    expect(res.status).toBe(400);
  });
});
