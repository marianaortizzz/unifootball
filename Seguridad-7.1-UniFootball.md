# 7.1 — Pruebas de Seguridad (OWASP) · UniFootball

**Responsable:** Mariana · **Tipo:** pruebas manuales (Postman / curl) · **Objetivo:** demostrar que la app
**resiste** al menos 3 riesgos del OWASP Top 10.

## Preparación (una sola vez)

1. Levantar las bases de datos:
   ```powershell
   docker start uf-postgres uf-mongo
   ```
2. Levantar el backend:
   ```powershell
   cd backend
   npm run start:dev
   ```
   La API queda en `http://localhost:3000` (Swagger en `/api/docs`).
3. Abrir **Postman** (o usar `curl.exe` desde PowerShell — ⚠️ usar `curl.exe`, no `curl`, porque
   en PowerShell `curl` es un alias distinto).

> Para cada prueba: **lanza la petición y captura pantalla** del request + el código de estado/respuesta.
> El criterio de "PASA" está al final de cada caso.

---

## ✅ Prueba 1 — A07: Fallos de Identificación y Autenticación
**(TC-SEC: control de acceso por JWT)**

**Hipótesis:** un endpoint protegido NO debe responder datos sin un JWT válido.

### 1a. Sin token
- **Método:** `GET`
- **URL:** `http://localhost:3000/auth/users`
- **Headers:** *(ninguno de Authorization)*

curl:
```powershell
curl.exe -i http://localhost:3000/auth/users
```

### 1b. Con token inventado
- **Método:** `GET`
- **URL:** `http://localhost:3000/auth/users`
- **Header:** `Authorization: Bearer token.falso.123`

curl:
```powershell
curl.exe -i -H "Authorization: Bearer token.falso.123" http://localhost:3000/auth/users
```

**Resultado esperado (ambas):** `HTTP 401 Unauthorized`.
**PASA si:** las dos devuelven **401** (la app no entrega usuarios sin credencial válida).

---

## ✅ Prueba 2 — A03: Inyección (SQL Injection)
**(TC-SEC: el login no es vulnerable a SQLi)**

**Hipótesis:** un payload de inyección clásico en el login NO debe autenticar ni romper la consulta.

- **Método:** `POST`
- **URL:** `http://localhost:3000/auth/login`
- **Header:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  { "email": "' OR '1'='1", "password": "' OR '1'='1" }
  ```

curl:
```powershell
curl.exe -i -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"' OR '1'='1\",\"password\":\"' OR '1'='1\"}"
```

**Resultado esperado:** `HTTP 400 Bad Request` →
```json
{ "message": ["email must be an email"], "error": "Bad Request", "statusCode": 400 }
```

**PASA si:** devuelve **400** (o 401), NUNCA 200.
**Por qué pasa (doble defensa):**
1. El `ValidationPipe` rechaza el string de inyección porque no es un email válido (lo corta antes de la BD).
2. Aunque pasara, TypeORM **parametriza** todas las consultas (no concatena SQL), así que la cadena
   se trataría como texto literal, no como código.

---

## ✅ Prueba 3 — A02: Fallos Criptográficos
**(TC-SEC: contraseñas hasheadas y nunca expuestas)**

**Hipótesis:** la contraseña se guarda cifrada (hash) y nunca se devuelve en las respuestas.

### 3a. La respuesta NO trae la contraseña
- **Método:** `POST`
- **URL:** `http://localhost:3000/auth/register`
- **Header:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  { "email": "demo.cripto@uni.edu", "name": "Demo Cripto", "password": "P@ssw0rd123" }
  ```

curl:
```powershell
curl.exe -i -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"demo.cripto@uni.edu\",\"name\":\"Demo Cripto\",\"password\":\"P@ssw0rd123\"}"
```

**Resultado esperado:** `HTTP 201` con `accessToken` y `user`, **sin** ningún campo `password`.

### 3b. En la base se guarda un hash bcrypt (evidencia)
Ejecuta en PowerShell (o en tu cliente de BD favorito):
```powershell
docker exec -it uf-postgres psql -U postgres -d unifootball -c "select email, left(password,7) as hash_prefix, length(password) as len from users where email='demo.cripto@uni.edu';"
```

**Resultado esperado:**
```
        email         | hash_prefix | len
----------------------+-------------+-----
 demo.cripto@uni.edu  | $2b$10$     |  60
```

**PASA si:** (a) la respuesta no contiene la contraseña, y (b) en la BD el campo `password`
empieza con `$2b$` (bcrypt) y mide 60 caracteres — nunca texto plano.

> Limpieza opcional al terminar:
> ```powershell
> docker exec -it uf-postgres psql -U postgres -d unifootball -c "delete from users where email='demo.cripto@uni.edu';"
> ```

---

## 🎁 Bonus (4º, igual de fácil) — A08: Mass Assignment / Over-posting
- **Método:** `POST` `http://localhost:3000/auth/register`
- **Body:** `{ "email":"x@uni.edu","name":"Hacker","password":"P@ssw0rd123","isAdmin":true }`
- **Esperado:** `HTTP 400` → `"property isAdmin should not exist"`.
- **PASA si:** rechaza el campo extra (el `whitelist + forbidNonWhitelisted` impide inyectar propiedades no permitidas).

---

---

## ✅ Prueba 5 — A03: XSS (escape de datos del usuario en el frontend) · AUTOMATIZADA
**(TC-SEC-006)**

**Hipótesis:** datos del usuario guardados con HTML malicioso se muestran como
texto, sin ejecutarse.

A diferencia de las anteriores, esta es **automatizada** (no manual). React escapa
todo el texto por defecto y el proyecto no usa `dangerouslySetInnerHTML`.

Cómo correrla:
```powershell
cd UniFootballFront/unifootball-front
npm test
```
El test `src/test/security.test.tsx` renderiza un equipo cuyo nombre es
`<img src=x onerror="...">` y verifica que: (a) aparece como texto literal,
(b) NO se crea ningún `<img>`, (c) el `onerror` nunca se ejecuta.

**PASA si:** el test queda en verde (1/1).

---

## Resumen de evidencia

| # | OWASP | Cómo | Esperado | Veredicto |
|---|-------|------|----------|-----------|
| 1 | A02 Criptografía | POST /auth/register + consulta BD | sin password / hash `$2b$` | ✅ PASA |
| 2 | A03 Inyección SQLi | POST /auth/login con `' OR '1'='1` | 400 / 401 (no 200) | ✅ PASA |
| 3 | A03 XSS (frontend) | `npm test` (security.test.tsx) | payload renderizado como texto | ✅ PASA |
| + | A07 Autenticación | GET /auth/users sin/with token falso | 401 | ✅ PASA |
| + | A08 Over-posting | POST /auth/register con `isAdmin` | 400 | ✅ PASA |

> **Hallazgo aparte (para el registro de defectos 1.3, NO es parte de "pasa"):**
> el backend **no valida el rol** del usuario en los endpoints (los permisos admin/árbitro/jugador
> se controlan solo en el frontend) y además el registro permite elegir `role: admin` libremente
> → **A01 Broken Access Control / escalada de privilegios**.
