# Pruebas E2E (Cypress) — UniFootball · Punto 5 del examen

Pruebas End-to-End del flujo completo desde el navegador (Cypress).
**20 pruebas en 6 specs**, todas en verde contra la app real.

## Requisitos para correrlas

La app debe estar levantada (las pruebas son contra el sistema real, no mocks):

```powershell
# 1. Bases de datos
docker start uf-postgres uf-mongo

# 2. Datos consistentes (admin, equipos, torneo, jugadores)
cd backend
npm run seed

# 3. Backend  (http://localhost:3000)
npm run start:dev

# 4. Frontend (http://localhost:5173)  -> en otra terminal
cd UniFootballFront/unifootball-front
npm run dev
```

## Ejecutar

```powershell
cd UniFootballFront/unifootball-front
npm run e2e            # headless (genera video en cypress/videos)
npm run cypress:open   # modo interactivo (elige navegador)
```

Credenciales del seed (todas con password `Password123`):
`admin@unifootball.com` (admin), `referee1@unifootball.com` (árbitro), jugadores `*@uni.edu`.

## Qué se prueba (specs)

| Spec | Pruebas | Cubre |
|------|:------:|-------|
| `auth.cy.ts` | 4 | Login OK / login inválido / validación de campos requeridos / accesibilidad (axe) |
| `session.cy.ts` | 4 | Ruta protegida sin sesión → /login, acceso con sesión, persistencia al recargar, logout |
| `tournaments.cy.ts` | 5 | **Flujo core**: crear torneo + validaciones (nombre, fechas, fin<inicio) + abrir detalle |
| `teams.cy.ts` | 3 | Crear equipo, validación de nombre, abrir plantilla |
| `roles.cy.ts` | 2 | Permisos: admin ve acciones de gestión, jugador no |
| `error-handling.cy.ts` | 2 | Qué ve el usuario si el servidor falla (500) / estado vacío |

## Cómo cumple la rúbrica del punto 5

**5.1 Flujos a automatizar**
- ✅ Registro de usuario nuevo → vía API (`cy.registerPlayer`, no hay UI de registro)
- ✅ Login / Logout con credenciales válidas e inválidas → `auth.cy.ts`
- ✅ Flujo principal del negocio (crear/listar/abrir torneos) → `tournaments.cy.ts`
- ✅ Gestión de sesión → `session.cy.ts`
- ✅ Roles y permisos (admin vs jugador) → `roles.cy.ts`
- ✅ Flujos de error críticos (servidor caído) → `error-handling.cy.ts`
- N/A: flujo de pago (la app no maneja pagos), wizard multipaso (no existe)

**5.2 Buenas prácticas**
- ✅ Selectores con `data-testid` (nunca clases CSS)
- ✅ Custom commands (`loginByApi`, `loginAsAdmin`, `getByTestId`, `registerPlayer`)
- ✅ `beforeEach` hace login vía API (no repite el flujo de UI)
- ✅ `cy.intercept()` para controlar respuestas de red (error-handling)
- ✅ Fixtures (`cypress/fixtures/tournament.json`)
- ✅ Tests independientes (sin orden) y limpieza (borra torneos creados; equipos: nombre único)
- ✅ Videos y screenshots activados para análisis de fallos
- ✅ Retry de tests inestables, máximo 2 (`retries.runMode`)
- ✅ Tests agrupados por módulo de negocio (un spec por módulo)
- ✅ App Actions (custom commands) para encapsular interacciones
- ✅ Accesibilidad básica incluida en un flujo crítico (`cy.checkA11y` en login)
