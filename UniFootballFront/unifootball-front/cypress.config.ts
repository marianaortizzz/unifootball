import { defineConfig } from 'cypress'

// Configuracion E2E (punto 5 del examen).
// La app debe estar corriendo antes de ejecutar:
//   - Bases de datos:  docker start uf-postgres uf-mongo
//   - Backend:         cd backend && npm run start:dev   (http://localhost:3000)
//   - Frontend:        npm run dev                        (http://localhost:5173)
//   - Datos del seed:  cd backend && npm run seed
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    // Evidencia para analisis de fallos (rubrica 5.2).
    video: true,
    screenshotOnRunFailure: true,
    // Reintento de tests inestables, maximo 2 (rubrica 5.2).
    retries: { runMode: 2, openMode: 0 },
    viewportWidth: 1280,
    viewportHeight: 800,
    env: {
      apiUrl: 'http://localhost:3000',
      adminEmail: 'admin@unifootball.com',
      refereeEmail: 'referee1@unifootball.com',
      password: 'Password123',
    },
  },
})
