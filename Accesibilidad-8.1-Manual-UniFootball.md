# 8.1 — Accesibilidad (WCAG 2.1) · Pruebas manuales · UniFootball

Las pruebas automatizadas (jest-axe, `npm test`) cubren imágenes con alt, labels,
errores anunciados y que los controles sean elementos operables. Pero **dos puntos
de la rúbrica requieren verificación en un navegador real** porque ni axe ni jsdom
pueden medirlos: la **navegación por teclado** completa y el **focus visible**.
Esta guía cubre eso + una corrida de Lighthouse como evidencia global.

## Preparación
1. `docker start uf-postgres uf-mongo`
2. Backend: `cd backend && npm run start:dev`
3. Frontend: `cd UniFootballFront/unifootball-front && npm run dev` → abrir http://localhost:5173
4. Login demo: `admin@unifootball.com` / `Password123`

> Para cada prueba: captura pantalla mostrando el estado (ej. el recuadro de focus
> visible sobre el botón). Marca ✅/❌.

---

## Prueba A — Navegación completa por teclado (WCAG 2.1.1)
**Objetivo:** poder usar la app SIN mouse.

Teclas: `Tab` (avanzar), `Shift+Tab` (retroceder), `Enter`/`Espacio` (activar),
`Esc` (cerrar modal).

| Paso | Acción (solo teclado) | Esperado |
|---|---|---|
| 1 | En Login, `Tab` por Email → Contraseña → ENTRAR | El foco recorre los 3 en orden lógico |
| 2 | Escribir credenciales y `Enter` | Inicia sesión |
| 3 | En Dashboard, `Tab` por las 4 tarjetas (Torneos, Equipos, Mis estadísticas, En vivo) | Cada tarjeta recibe foco |
| 4 | `Enter` sobre una tarjeta | Navega a esa sección |
| 5 | En Equipos (como admin), `Tab` hasta "+ Nuevo equipo" y `Enter` | Abre el modal |
| 6 | `Tab` por los campos del modal y `Esc` | Se navega el formulario y `Esc`/Cancelar lo cierra |
| 7 | `Tab` hasta el logo "UNIFOOTBALL" y `Enter` | Vuelve al Dashboard |

**PASA si:** todo el flujo se completa sin tocar el mouse y el orden de foco es lógico.

---

## Prueba B — Focus visible (WCAG 2.4.7)
**Objetivo:** siempre se ve QUÉ elemento tiene el foco.

| Paso | Acción | Esperado |
|---|---|---|
| 1 | Recorre con `Tab` botones, enlaces, inputs y selects de cada página | Cada elemento enfocado muestra un **contorno verde** (outline de 2px) claramente visible |
| 2 | Enfoca un input de formulario | Se ve el contorno / borde resaltado |

> Nota técnica: se agregó una regla global `:focus-visible { outline: 2px solid }`
> en `index.css`, por eso el indicador aparece al navegar con teclado (no con clic
> de mouse, que es el comportamiento correcto de `:focus-visible`).

**PASA si:** ningún elemento interactivo queda enfocado "invisible".

---

## Prueba C — Lighthouse (evidencia global, mide contraste de color)
axe en los tests no puede medir contraste; Lighthouse sí.

1. En Chrome, abre la app y entra a una pantalla (ej. Dashboard).
2. `F12` → pestaña **Lighthouse** → marca solo **Accessibility** → **Analyze page load**.
3. Repite en Login y en otra página.

**Evidencia:** captura del score de Accessibility y de la lista de "Passed audits"
(incluye: image alt, labels, contrast, names and labels, etc.).
**Meta sugerida:** score ≥ 90.

---

## Cobertura de la rúbrica 8.1 (resumen)

| # | Punto WCAG | Cómo se demuestra |
|---|---|---|
| 1 | Imágenes con alt | Automatizado (test "ninguna imagen sin alt") + Lighthouse |
| 2 | Navegable 100% con teclado | **Manual (Prueba A)** + parte automatizada (controles son `<button>`) |
| 3 | Focus visible | **Manual (Prueba B)** + regla CSS `:focus-visible` |
| 4 | Inputs con label | Automatizado (Login y formulario de Equipos) |
| 5 | Errores con aria-live/aria-describedby | Automatizado (test del error del Login con `role="alert"` + `aria-describedby`) |
