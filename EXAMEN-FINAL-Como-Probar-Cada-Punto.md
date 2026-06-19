# 🎯 Archivo maestro — Cómo probar cada punto de la rúbrica (Examen Final)

Guía rápida para el examen: el profe dice un punto de la rúbrica y aquí está **qué mostrar**,
**qué comando correr** y **dónde está la evidencia**. (M = Mariana, A = Andrés.)

---

## 0) Antes de empezar (levantar todo una vez)

La mayoría de las pruebas necesitan las bases de datos, el backend y/o el frontend corriendo.

```powershell
# 1. Bases de datos (Postgres + Mongo en Docker)
docker start uf-postgres uf-mongo

# 2. Datos consistentes (admin, equipos, torneo, jugadores). Resetea las BD.
cd backend
npm run seed

# 3. Backend (API REST) -> http://localhost:3000
npm run start:dev

# 4. Frontend (en OTRA terminal) -> http://localhost:5173
cd UniFootballFront/unifootball-front
npm run dev
```

**Verificar que está arriba:**
```powershell
docker ps                                  # uf-postgres y uf-mongo "Up"
curl http://localhost:3000                 # responde
curl http://localhost:5173                 # responde
```

Credenciales del seed (todas con `Password123`): `admin@unifootball.com` (admin),
`referee1@unifootball.com` (árbitro), jugadores `*@uni.edu`.

> Carpetas: backend = `backend/` · frontend = `UniFootballFront/unifootball-front/`

---

## 1. Documentación

### 1.1 Test Plan (M)
- **Mostrar:** `Test-Plan-UniFootball.docx` (cumple los 13 puntos de la rúbrica).
- **Correr:** nada, es documento. Abrir y recorrer las secciones (alcance, estrategia por capa,
  criterios entrada/salida, entornos, herramientas, gestión de defectos, métricas, riesgos).

### 1.2 Casos de prueba (M)
- **Mostrar:** `Pruebas_UniFootball_v2.xlsx`, hoja **'Casos de Prueba'** (54 casos, 10 capas,
  campos obligatorios: ID, precondiciones, pasos, resultado esperado/real, status, severidad…).

### 1.3 Registro de defectos / Bug report (M/A)
- **Mostrar:** `Pruebas_UniFootball_v2.xlsx`, hoja **'Registro de Defectos'** (9 defectos con
  ID, actual vs esperado, pasos, severidad/prioridad, entorno, estado del ciclo).

---

## 2. Configuración de calidad

### 2.2 Configuración TypeScript (M)
- **Mostrar:** `backend/tsconfig.json` (strict, noImplicitAny, strictNullChecks, noUnusedLocals/Parameters)
  y los `eslint.config.mjs` (regla `no-explicit-any`, prettier).
- **Correr:**
  ```powershell
  cd backend
  npx tsc --noEmit -p tsconfig.json     # 0 errores con strict
  npm run lint                          # eslint limpio
  ```
  Frontend: `cd UniFootballFront/unifootball-front; npm run build` (corre tsc) y `npm run lint`.

---

## 3. Pruebas unitarias (A — hechas por Mariana)

### 3.1 / 3.2 Unit tests (aislados, con mocks)
- **Idea clave:** prueban **una unidad aislada**; todo lo externo (BD, bcrypt, JWT) está **mockeado**.
- **Correr backend (35 tests):**
  ```powershell
  cd backend
  npx jest                              # 7 suites, 35/35 verde (NO necesita BD)
  ```
- **Correr frontend (componentes):**
  ```powershell
  cd UniFootballFront/unifootball-front
  npx vitest run src/test/unit.test.tsx   # login required fields + gateo de rol
  ```
- **Evidencia:** specs `backend/src/**/*.service.spec.ts`, `src/test/unit.test.tsx`.
  Excel: casos **TC-UNIT-001..017** en Pass.
- **Buenas prácticas (3.2):** patrón AAA, describe anidados, un concepto por test, sin if/loops,
  tests independientes.

---

## 4. Pruebas de integración (M)

> 4.1 pega a la **API corriendo**; 4.2/4.3 se conectan **directo a las BD**. Todas necesitan
> `docker start uf-postgres uf-mongo`. Para 4.1 además la API debe estar arriba (`npm run start:dev`).

### 4.1 Pruebas de la API REST
- **Correr:**
  ```powershell
  cd backend
  npm run test:e2e -- auth.e2e-spec        # 8 casos (401/201/400…)
  npm run test:e2e -- tournaments.e2e-spec # 7 casos (CRUD + validaciones)
  ```
- **Evidencia:** `backend/test/auth.e2e-spec.ts`, `tournaments.e2e-spec.ts`. Excel: TC-API.

### 4.2 Base de datos relacional (PostgreSQL)
- **Correr:**
  ```powershell
  cd backend
  npm run test:e2e -- database.e2e-spec    # 7 casos: CRUD, UNIQUE, FK, JOIN
  ```
- **Evidencia:** `backend/test/database.e2e-spec.ts`. Excel: TC-DBSQL.

### 4.3 Base de datos NoSQL (MongoDB)
- **Correr:**
  ```powershell
  cd backend
  npm run test:e2e -- mongo.e2e-spec       # 7 casos: CRUD, validación schema/enum, índice
  ```
- **Evidencia:** `backend/test/mongo.e2e-spec.ts`. Excel: TC-DBNOSQL.

> Para correr **todo** el e2e junto: `npm run test:e2e`.

---

## 5. Pruebas End-to-End (A — hechas por Mariana)

### 5.1 / 5.2 E2E con Cypress
- **Requiere:** DBs + backend + frontend + seed (sección 0).
- **Correr:**
  ```powershell
  cd UniFootballFront/unifootball-front
  npm run e2e            # headless, 6 specs / 20 tests, genera video en cypress/videos
  # o interactivo:
  npm run cypress:open
  ```
- **Evidencia:** `UniFootballFront/unifootball-front/cypress/` (specs auth, session, tournaments,
  teams, roles, error-handling) + guía `cypress/README.md`. Excel: TC-E2E.

---

## 6. Pruebas de rendimiento (A — **pendiente de Andrés**)
- Si el profe pide este punto, es de **Andrés** (k6 / Artillery: load/stress/spike/soak).
- Estado: aún no implementado por nuestra parte.

---

## 7. Pruebas de seguridad (M)

### 7.1 OWASP Top 10 (mínimo 3, tenemos 3 en Pass + extras)
- **Automatizado (A03 XSS):**
  ```powershell
  cd UniFootballFront/unifootball-front
  npx vitest run src/test/security.test.tsx     # el HTML malicioso se escapa, no se ejecuta
  ```
- **A06 dependencias vulnerables:**
  ```powershell
  cd backend
  npm audit                                      # reporta las vulnerabilidades (high)
  ```
- **Manual (A02 bcrypt, A03 SQLi, A07/A08):** seguir `Seguridad-7.1-UniFootball.md` (raíz).
- **Evidencia:** Excel casos **TC-SEC** (003 A02, 004 A03 SQLi, 006 A03 XSS en Pass).

---

## 8. Accesibilidad y compatibilidad (M)

### 8.1 Accesibilidad (WCAG 2.1)
- **Correr (12 tests con axe):**
  ```powershell
  cd UniFootballFront/unifootball-front
  npx vitest run src/test/accessibility.test.tsx
  ```
- **Manual (teclado, focus, Lighthouse):** guía `Accesibilidad-8.1-Manual-UniFootball.md`.
- **Evidencia:** Excel casos **TC-A11Y**.

### 8.2 Compatibilidad de navegadores (manual)
- **Correr:** abrir la app (sección 0) en **Chrome, Edge, Firefox y Opera** + 6 viewports y llenar
  las matrices de la guía `Compatibilidad-8.2-Manual-UniFootball.md` (~10 min).
- **Evidencia:** Excel casos **TC-COMPAT** (requieren la corrida visual para pasar a Pass).

---

## 11. Observabilidad (A — hechas por Mariana)

### 11.1 Logs (los 6 puntos)
- **Demo JSON puro + correlation id + redacción (recomendado):**
  ```powershell
  cd backend
  npm run build
  $env:NODE_ENV="production"; npm run start:prod      # logs JSON en :3000
  ```
  En otra terminal, generar tráfico y observar los logs:
  ```powershell
  curl http://localhost:3000/                          # level info (200)
  curl http://localhost:3000/no-existe                 # level warn (404)
  # login + request con Authorization -> en el log sale "authorization":"[REDACTED]"
  ```
- **Test de redacción:** `cd backend; npx jest src/logging`  (4/4).
- **Evidencia:** `backend/src/logging/logger.options.ts` + guía `Logs-11.1-UniFootball.md`.

### 11.1 Métricas (2 puntos: RED + Business)
- **Requiere:** la API corriendo (dev o prod). Generar algo de tráfico (un login, etc.) y luego:
  ```powershell
  curl http://localhost:3000/metrics
  ```
  Buscar:
  - `http_request_duration_seconds_count{...}` → **RED** (Rate/Errors/Duration por endpoint)
  - `unifootball_business_events_total{event="login"|"registration"}` → **Business**
- **Evidencia:** `backend/src/metrics/` + guía `Metricas-11.1-UniFootball.md`.

---

## 🗂️ Mapa rápido punto → evidencia

| Punto | Comando clave | Documento / archivo |
|-------|---------------|---------------------|
| 1.1 | (abrir) | `Test-Plan-UniFootball.docx` |
| 1.2 / 1.3 | (abrir) | `Pruebas_UniFootball_v2.xlsx` |
| 2.2 | `npx tsc --noEmit` / `npm run lint` | `backend/tsconfig.json` |
| 3.1/3.2 | `npx jest` + `vitest run src/test/unit.test.tsx` | `*.service.spec.ts`, Excel TC-UNIT |
| 4.1 | `npm run test:e2e -- auth.e2e-spec` | `test/auth.e2e-spec.ts` |
| 4.2 | `npm run test:e2e -- database.e2e-spec` | `test/database.e2e-spec.ts` |
| 4.3 | `npm run test:e2e -- mongo.e2e-spec` | `test/mongo.e2e-spec.ts` |
| 5.1/5.2 | `npm run e2e` (Cypress) | `cypress/README.md` |
| 6.x | (Andrés, pendiente) | — |
| 7.1 | `vitest run src/test/security.test.tsx` + `npm audit` | `Seguridad-7.1-UniFootball.md` |
| 8.1 | `vitest run src/test/accessibility.test.tsx` | `Accesibilidad-8.1-Manual-UniFootball.md` |
| 8.2 | abrir en 4 navegadores | `Compatibilidad-8.2-Manual-UniFootball.md` |
| 11.1 Logs | `start:prod` + curl, `npx jest src/logging` | `Logs-11.1-UniFootball.md` |
| 11.1 Métricas | `curl /metrics` | `Metricas-11.1-UniFootball.md` |
