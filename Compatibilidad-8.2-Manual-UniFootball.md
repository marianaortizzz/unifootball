# 8.2 — Compatibilidad de Navegadores y Dispositivos · UniFootball

**Responsable:** Mariana · **Tipo:** pruebas manuales (cross-browser + responsive) · **Objetivo:**
demostrar que la app **funciona y se ve correctamente** en los navegadores y tamaños de pantalla
más comunes (rúbrica 8.2).

Cubre dos casos:
- **TC-COMPAT-001** — Cross-browser: Chrome, Edge, Firefox y Opera.
- **TC-COMPAT-002** — Responsive: viewports de desktop, tablet y móvil.

> Nota: la rúbrica menciona Safari, pero Safari solo corre en macOS/iOS y el equipo trabaja en
> Windows. Se sustituye por **Opera** (4º navegador disponible). Chrome, Edge y Opera comparten el
> motor **Chromium/Blink**; Firefox usa **Gecko** — así se prueban los dos motores de render que
> cubren >95% del mercado en escritorio.

---

## Respaldo técnico (por qué se espera que pase)

Antes de la prueba manual se hizo una revisión estática del frontend que justifica el resultado:

- **Sin APIs específicas de navegador:** no se usa `navigator.*` propietario, `showOpenFilePicker`,
  `requestIdleCallback`, `structuredClone`, ni `crypto.randomUUID` en el front.
- **Sin CSS que requiera vendor prefixes ni features experimentales:** no hay `-webkit-`/`-moz-`/`-ms-`,
  ni `:has()`, ni `backdrop-filter`, ni `aspect-ratio`. El layout usa **Flexbox y CSS Grid**, soportados
  por todos los navegadores actuales.
- **Única API "moderna":** `Array.prototype.at()` (en `TournamentDetailPage.tsx`), disponible desde
  2022 en Chrome 92+, Edge 92+, Firefox 90+, Opera 78+ y Safari 15.4+.
- **Build target de Vite:** por defecto apunta a navegadores con soporte de ES modules nativos
  (todos los modernos). React 19 + react-router son librerías cross-browser estándar.

Conclusión del análisis: **no hay incompatibilidades de código conocidas**. La prueba manual
confirma visualmente render y funcionalidad.

---

## Preparación (una sola vez)

1. Levantar las bases de datos y el backend:
   ```powershell
   docker start uf-postgres uf-mongo
   cd backend
   npm run start:dev          # API en http://localhost:3000
   ```
2. Levantar el frontend:
   ```powershell
   cd UniFootballFront/unifootball-front
   npm run dev                # normalmente http://localhost:5173
   ```
3. Tener instalados los 4 navegadores: **Chrome, Edge, Firefox, Opera**.
4. Credenciales demo para iniciar sesión: usuario seed con password `Password123`.

> Para cada celda de las matrices: **toma una captura** del flujo/viewport y marca ✅ / ❌.

---

## Flujo "core" a ejecutar en cada navegador

Es el recorrido mínimo que toca render, navegación, formularios y datos de la API:

1. **Login** (`/login`) — entrar con las credenciales demo.
2. **Dashboard** (`/dashboard`) — se ven las tarjetas; los íconos y textos no se solapan.
3. **Equipos** (`/teams`) — la lista carga; abrir el formulario "Nuevo equipo".
4. **Torneos** (`/tournaments`) — la lista carga; entrar a un torneo (`/tournaments/:id`).
5. **Navbar** — navegar entre secciones y cerrar sesión.

En cada paso verificar: **(a)** la página renderiza sin elementos rotos, **(b)** no hay errores en la
consola del navegador (F12 → Console), **(c)** los datos de la API se muestran.

---

## TC-COMPAT-001 — Cross-browser

Repetir el flujo core en cada navegador (última versión estable).

| Paso del flujo            | Chrome | Edge | Firefox | Opera |
|---------------------------|:------:|:----:|:-------:|:-----:|
| 1. Login                  |        |      |         |       |
| 2. Dashboard              |        |      |         |       |
| 3. Equipos + form         |        |      |         |       |
| 4. Torneos + detalle      |        |      |         |       |
| 5. Navbar + logout        |        |      |         |       |
| Consola sin errores (F12) |        |      |         |       |

**PASA si:** todas las celdas quedan en ✅ (la app funciona y se ve igual en los 4 navegadores,
sin errores de consola).

---

## TC-COMPAT-002 — Responsive (viewports)

Usar las **DevTools** de Chrome/Edge (F12 → ícono de dispositivo / *Toggle device toolbar*,
atajo `Ctrl+Shift+M`) para fijar cada viewport, o redimensionar la ventana.

| Viewport            | Tipo    | Layout correcto | Sin scroll horizontal | Usable |
|---------------------|---------|:---------------:|:---------------------:|:------:|
| 1920×1080           | Desktop |                 |                       |        |
| 1440×900            | Desktop |                 |                       |        |
| 1280×720            | Desktop |                 |                       |        |
| 768×1024 (iPad)     | Tablet  |                 |                       |        |
| 390×844 (iPhone)    | Móvil   |                 |                       |        |
| 360×800 (Android)   | Móvil   |                 |                       |        |

En cada viewport revisar en el Dashboard, Equipos y Torneos: que **no haya scroll horizontal**,
que los elementos **no se solapen** y que los botones/inputs sean **accesibles** (no cortados).

**PASA si:** todas las filas quedan usables, sin scroll horizontal ni solapamientos.

---

## Resumen de evidencia

| Caso          | Qué se prueba                       | Cómo                          | Veredicto |
|---------------|-------------------------------------|-------------------------------|-----------|
| TC-COMPAT-001 | Chrome, Edge, Firefox, Opera        | Flujo core manual + F12       | (llenar)  |
| TC-COMPAT-002 | 3 desktop + 1 tablet + 2 móvil      | DevTools device toolbar       | (llenar)  |

> Tiempo estimado: ~5–8 min cross-browser + ~5 min responsive. Adjuntar capturas al reporte.
