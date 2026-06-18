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

## Resumen de evidencia

| # | OWASP | Petición | Esperado | Veredicto |
|---|-------|----------|----------|-----------|
| 1 | A07 Autenticación | GET /auth/users sin/with token falso | 401 | ✅ PASA |
| 2 | A03 Inyección SQLi | POST /auth/login con `' OR '1'='1` | 400 / 401 (no 200) | ✅ PASA |
| 3 | A02 Criptografía | POST /auth/register + consulta BD | sin password / hash `$2b$` | ✅ PASA |
| 4 | A08 Over-posting (bonus) | POST /auth/register con `isAdmin` | 400 | ✅ PASA |

> **Hallazgo aparte (para el registro de defectos 1.3, NO es parte de "pasa"):**
> el backend **no valida el rol** del usuario en los endpoints (los permisos admin/árbitro/jugador
> se controlan solo en el frontend) y además el registro permite elegir `role: admin` libremente
> → **A01 Broken Access Control / escalada de privilegios**.
