import { randomUUID } from 'crypto';
import request from 'supertest';

// TC-API-001..00x — Pruebas de integración de la API de autenticación.
// Se ejecutan contra la API REAL CORRIENDO (caja negra, HTTP de verdad).
// Requisitos para correrlas:
//   1) docker start uf-postgres uf-mongo
//   2) cd backend && npm run start:dev   (API en http://localhost:3000)
const BASE_URL = process.env.API_URL ?? 'http://localhost:3000';
const PASSWORD = 'P@ssw0rd123';

// supertest entrega res.body como `any`; estas formas dan acceso seguro.
interface AuthBody {
  accessToken: string;
  user: { id: string; email: string; name: string; role: string };
}
interface ValidationErrorBody {
  message: string[] | string;
  statusCode: number;
}
interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

const uniqueEmail = () => `e2e-${randomUUID()}@uni.edu`;

describe('Auth API (e2e contra la API corriendo)', () => {
  // Usuario principal registrado una vez y reutilizado en varios casos.
  const mainEmail = uniqueEmail();
  let mainToken: string;

  beforeAll(async () => {
    // Falla con un mensaje claro si la API no está levantada.
    const ping = await request(BASE_URL)
      .get('/')
      .catch(() => null);
    if (!ping || ping.status !== 200) {
      throw new Error(
        `La API no responde en ${BASE_URL}. Levántala con: cd backend && npm run start:dev`,
      );
    }

    const res = await request(BASE_URL).post('/auth/register').send({
      email: mainEmail,
      name: 'Usuario Principal',
      password: PASSWORD,
    });
    mainToken = (res.body as AuthBody).accessToken;
  });

  // ----- POST /auth/register -----

  it('POST /auth/register crea un usuario y devuelve 201 + token (happy path)', async () => {
    const res = await request(BASE_URL).post('/auth/register').send({
      email: uniqueEmail(),
      name: 'Andrés López',
      password: PASSWORD,
      role: 'player',
    });

    expect(res.status).toBe(201);
    const body = res.body as AuthBody;
    expect(typeof body.accessToken).toBe('string');
    expect(body.user.name).toBe('Andrés López');
    // Nunca debe exponerse la contraseña (ni el hash) en la respuesta.
    expect(body.user).not.toHaveProperty('password');
  });

  it('POST /auth/register devuelve 409 si el email ya está registrado', async () => {
    const res = await request(BASE_URL).post('/auth/register').send({
      email: mainEmail, // ya registrado en beforeAll
      name: 'Repetido',
      password: PASSWORD,
    });
    expect(res.status).toBe(409);
  });

  it('POST /auth/register devuelve 400 con email inválido y contraseña corta', async () => {
    const res = await request(BASE_URL)
      .post('/auth/register')
      .send({ email: 'no-es-email', name: 'X', password: '123' });

    expect(res.status).toBe(400);
    const body = res.body as ValidationErrorBody;
    expect(body.message).toEqual(expect.arrayContaining([expect.any(String)]));
  });

  it('POST /auth/register devuelve 400 si llegan campos no permitidos (whitelist)', async () => {
    const res = await request(BASE_URL).post('/auth/register').send({
      email: uniqueEmail(),
      name: 'Campo Extra',
      password: PASSWORD,
      isAdmin: true, // campo no declarado en el DTO -> debe rechazarse
    });
    expect(res.status).toBe(400);
  });

  // ----- POST /auth/login -----

  it('POST /auth/login devuelve 200 + token con credenciales correctas', async () => {
    const res = await request(BASE_URL)
      .post('/auth/login')
      .send({ email: mainEmail, password: PASSWORD });

    expect(res.status).toBe(200);
    const body = res.body as AuthBody;
    expect(typeof body.accessToken).toBe('string');
    expect(body.user.email).toBe(mainEmail);
  });

  it('POST /auth/login devuelve 401 con contraseña incorrecta', async () => {
    const res = await request(BASE_URL)
      .post('/auth/login')
      .send({ email: mainEmail, password: 'ContraseñaIncorrecta1' });
    expect(res.status).toBe(401);
  });

  // ----- GET /auth/users (ruta protegida) -----

  it('GET /auth/users devuelve 401 sin token JWT', async () => {
    const res = await request(BASE_URL).get('/auth/users');
    expect(res.status).toBe(401);
  });

  it('GET /auth/users devuelve 200 con token válido', async () => {
    const res = await request(BASE_URL)
      .get('/auth/users')
      .set('Authorization', `Bearer ${mainToken}`);

    expect(res.status).toBe(200);
    const body = res.body as UserListItem[];
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).not.toHaveProperty('password');
  });
});
