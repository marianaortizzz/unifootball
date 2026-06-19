# 11.1 — Observabilidad: Métricas · UniFootball

**Responsable:** Mariana (cubre la parte de Andrés) · **Capa:** Backend (NestJS) ·
**Objetivo:** exponer métricas de la aplicación (rúbrica 11.1 → sección *Métricas*, **mínimo 2 puntos**).

Se cumplen **2 puntos** (los más directos sobre el pipeline existente), con **Prometheus** (`prom-client`)
expuestos en `GET /metrics` en formato estándar de Prometheus (listo para Grafana/Datadog).

---

## Implementación

| Archivo | Qué hace |
|---------|----------|
| `backend/src/metrics/metrics.module.ts` | Registro de métricas + providers (histograma, contador) |
| `backend/src/metrics/metrics.interceptor.ts` | Interceptor global que mide cada request (RED) |
| `backend/src/metrics/metrics.controller.ts` | `GET /metrics` (endpoint de scrape) |
| `backend/src/auth/auth.service.ts` | Incrementa el contador de negocio en registro/login |

---

## Punto 1 cumplido — RED metrics por endpoint (Rate, Errors, Duration)

Métrica: **`http_request_duration_seconds`** (histograma) con etiquetas `method`, `route`, `status_code`.
Un interceptor global mide cada request y la registra al finalizar la respuesta.

- **Rate** (peticiones/seg): `http_request_duration_seconds_count` (su derivada en el tiempo).
- **Errors** (%): se filtra por la etiqueta `status_code` (4xx/5xx vs total).
- **Duration** (ms): los `http_request_duration_seconds_bucket` + `_sum`/`_count` (promedio y percentiles).

Ejemplo real del scrape:
```
http_request_duration_seconds_count{method="GET",route="/",status_code="200"} 2
http_request_duration_seconds_count{method="POST",route="/auth/login",status_code="200"} 1
http_request_duration_seconds_count{method="POST",route="/auth/register",status_code="201"} 1
http_request_duration_seconds_bucket{le="0.05",method="GET",route="/",status_code="200"} 2
```
> Nota: las requests rechazadas por un *guard* (ej. 401 sin token) no pasan por el interceptor,
> por diseño de NestJS (los guards corren antes que los interceptors). RED cubre las requests
> que llegan a un handler.

## Punto 2 cumplido — Business metrics

Métrica: **`unifootball_business_events_total`** (contador) con etiqueta `event`.
Se incrementa en eventos de negocio del dominio:
- `event="registration"` → en cada registro de usuario exitoso (`POST /auth/register`).
- `event="login"` → en cada inicio de sesión exitoso (`POST /auth/login`).

Ejemplo real del scrape:
```
unifootball_business_events_total{event="login"} 1
unifootball_business_events_total{event="registration"} 1
```
Con esto se obtienen "registros por minuto" / "logins por minuto" (rate del contador), que son
métricas de negocio típicas. Es trivial añadir más eventos (`tournament_created`, etc.) repitiendo
`this.businessEvents.inc({ event: '...' })`.

> Extra (no contabilizado): `collectDefaultMetrics` añade métricas del proceso Node
> (CPU, memoria, event loop), útiles como base de métricas USE de infraestructura.

---

## Cómo demostrarlo

```powershell
docker start uf-postgres uf-mongo
cd backend
npm run build
$env:NODE_ENV="production"; npm run start:prod     # http://localhost:3000

# En otra terminal: generar tráfico y leer las métricas
curl http://localhost:3000/
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"admin@unifootball.com","password":"Password123"}'
curl http://localhost:3000/metrics                 # formato Prometheus
```

Para un **dashboard** (punto opcional de la rúbrica) basta apuntar un Prometheus a
`http://localhost:3000/metrics` y graficar en Grafana — la app ya expone todo lo necesario.
