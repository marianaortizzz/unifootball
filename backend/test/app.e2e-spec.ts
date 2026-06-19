import request from 'supertest';

// Smoke test contra la API CORRIENDO (no monta la app en memoria).
// Requiere el backend levantado: cd backend && npm run start:dev
const BASE_URL = process.env.API_URL ?? 'http://localhost:3000';

describe('API corriendo (smoke)', () => {
  it('GET / responde 200 (la API está arriba)', async () => {
    const res = await request(BASE_URL).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello World!');
  });
});
