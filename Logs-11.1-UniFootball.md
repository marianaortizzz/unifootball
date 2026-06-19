# 11.1 — Observabilidad: Logs · UniFootball

**Responsable:** Mariana (cubre la parte de Andrés) · **Capa:** Backend (NestJS) ·
**Objetivo:** logging estructurado, trazable y seguro (rúbrica 11.1 → sección *Logs*, cumplir **todos** los puntos).

Implementado con **Pino** (`nestjs-pino` + `pino-http`), el logger JSON más rápido del ecosistema Node.

---

## Resumen de la implementación

| Archivo | Qué hace |
|---------|----------|
| `backend/src/logging/logger.options.ts` | Configuración del logger (JSON, niveles, correlation ID, redacción) |
| `backend/src/app.module.ts` | `LoggerModule.forRoot(loggerOptions)` |
| `backend/src/main.ts` | `app.useLogger(app.get(Logger))` + `bufferLogs` |
| `backend/src/logging/logger.options.spec.ts` | Test unitario de redacción (4 casos) |

---

## Cómo cumple cada punto de la rúbrica (Logs)

### ✅ 1. Logging estructurado en JSON (Pino/Winston)
Pino emite **una línea JSON por evento**, ideal para indexar/buscar en un agregador
(Loki, Elastic, CloudWatch). Ejemplo real de una respuesta:
```json
{"level":30,"time":1781890140595,"req":{"id":"5cc9897a-...","method":"GET","url":"/tournaments"},"res":{"statusCode":200},"responseTime":11,"msg":"GET /tournaments"}
```
En **desarrollo** se usa `pino-pretty` (coloreado, legible); en **producción** (`NODE_ENV=production`) se emite JSON puro.

### ✅ 2. Niveles de log correctos (error / warn / info / debug)
`customLogLevel` asigna el nivel según el resultado del request:
- **error** (50): respuestas 5xx o excepción.
- **warn** (40): respuestas 4xx (ej. 404, 400). *Verificado: el 404 sale como `"level":40`.*
- **info** (30): respuestas exitosas.
- El nivel base es `debug` en desarrollo e `info` en producción (configurable con `LOG_LEVEL`).

### ✅ 3. Correlation ID en cada request (trazabilidad end-to-end)
`genReqId` asigna un **UUID** a cada request, lo expone en el header de respuesta
`x-request-id` y **respeta** un `x-request-id` entrante (para correlacionar entre servicios).
Todos los logs de ese request comparten `req.id`. *Verificado: header devuelto y `req.id` presente en cada línea.*

### ✅ 4. Sin datos sensibles en logs (passwords, tokens, PII)
`redact` censura con `[REDACTED]`:
`req.headers.authorization` (token JWT), `req.headers.cookie`, `res.headers["set-cookie"]`,
`password`, `*.password`, `req.body.password`, `req.body.token`.
*Verificado: en un request autenticado el log muestra `"authorization":"[REDACTED]"`.*
Además, `pino-http` **no registra el body** del request por defecto, así que la contraseña
del login nunca llega al log. Cubierto por test unitario (4 casos).

### ✅ 5. Reporte de logs (DevOps)
Estrategia **12-factor**: la app escribe los logs a **stdout** (no a archivos). En el contenedor
Docker, la plataforma (o un agente como Promtail/Fluent Bit) los recoge y los envía al agregador.
- Local / Docker: `docker logs <contenedor>` o `npm run start:prod | <colector>`.
- Si se requiere archivo con rotación, se añade un transport de Pino:
  ```ts
  transport: { target: 'pino/file', options: { destination: './logs/app.log', mkdir: true } }
  ```
  y se rota con `logrotate` o `pino-roll`.

### ✅ 6. Retención de logs definida
Política recomendada (se aplica en el agregador, no en la app):
- **30 días hot** (consulta inmediata, ej. Loki/Elastic).
- **90 días cold** (almacenamiento barato, ej. S3 / archivo comprimido).
- Después: borrado automático por *retention policy*.
Como los logs salen por stdout, la retención se controla en la capa de infraestructura
(ej. `awslogs` retention de CloudWatch, ILM de Elastic, o `max-size`/`max-file` del
log-driver de Docker).

---

## Cómo demostrarlo

```powershell
# 1. Bases de datos arriba
docker start uf-postgres uf-mongo

# 2. Compilar y arrancar en modo producción (JSON puro)
cd backend
npm run build
$env:NODE_ENV="production"; npm run start:prod   # API en http://localhost:3000

# 3. En otra terminal, generar tráfico y observar los logs JSON:
curl http://localhost:3000/                                   # info  (200)
curl http://localhost:3000/no-existe                          # warn  (404)
#   login + request autenticado -> el header Authorization sale [REDACTED]
```

Test unitario de redacción:
```powershell
cd backend
npx jest src/logging          # 4/4 verde
```
