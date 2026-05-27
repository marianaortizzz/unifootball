# Guía de despliegue — UniFootball

Arquitectura: **Backend NestJS** (API REST) + **Frontend React/Vite** (estático) + **Postgres (Supabase)** y **MongoDB (Atlas)** ya en la nube.

---

## 0. Antes de empezar: arreglar el `npm install`

Tu `npm install` falla con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Eso significa que tu red (proxy/firewall corporativo) intercepta el tráfico TLS con su propio certificado, y Node no lo reconoce. **No es un problema de versiones del proyecto.** Opciones, de la más recomendable a la menos:

1. **Confiar en el certificado del proxy (lo correcto):** consigue el `.crt` raíz de tu organización y apúntale Node:
   ```powershell
   $env:NODE_EXTRA_CA_CERTS="C:\ruta\al\corp-root-ca.crt"
   npm install
   ```
2. **Usar otra red** (datos móviles / red de casa) solo para instalar. El `node_modules` resultante ya sirve.
3. **Último recurso (inseguro, solo para desarrollo local):**
   ```powershell
   npm install --no-audit --strict-ssl=false
   ```

> Tip extra: el proyecto está dentro de **OneDrive**, que a veces bloquea archivos durante la instalación. Si ves errores de tipo `EPERM`, pausa la sincronización de OneDrive mientras corre `npm install`.

---

## 1. Correr en local

**Backend** (`backend/`):
```powershell
cd backend
copy .env.example .env   # y rellena tus credenciales reales
npm install
npm run start:dev        # API en http://localhost:3000  ·  Swagger en /api/docs
```

**Frontend** (`UniFootballFront/unifootball-front/`):
```powershell
cd UniFootballFront/unifootball-front
npm install
npm run dev              # http://localhost:5173
```

El front por defecto apunta a `http://localhost:3000`; el back permite CORS desde `http://localhost:5173`. No necesitas `.env` en el front para desarrollo local.

---

## 2. Desplegar el Backend (Render — gratis y sencillo)

1. Sube el repo a GitHub.
2. En [render.com](https://render.com) → **New → Web Service** → conecta el repo.
3. Configura:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
4. En **Environment** añade las variables (ver `backend/.env.example`):
   - `DATABASE_URL`, `MONGODB_URI`, `JWT_SECRET`, `PORT` (Render lo inyecta solo, puedes omitirlo)
   - `CORS_ORIGIN` = la URL pública de tu frontend (la del paso 3, ej. `https://unifootball.vercel.app`)
5. Deploy. Anota la URL pública, ej. `https://unifootball-api.onrender.com`.

> Alternativa igual de simple: **Railway**. Mismo esquema (root `backend`, build `npm run build`, start `npm run start:prod`, variables de entorno).

---

## 3. Desplegar el Frontend (Vercel o Netlify)

En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo:
- **Root Directory:** `UniFootballFront/unifootball-front`
- **Framework Preset:** Vite (lo detecta solo)
- **Build Command:** `npm run build` · **Output:** `dist`
- **Environment Variable:** `VITE_API_URL` = la URL del backend del paso 2 (ej. `https://unifootball-api.onrender.com`)

Deploy. Toma la URL final (ej. `https://unifootball.vercel.app`) y **ponla en `CORS_ORIGIN` del backend** (paso 2.4) para cerrar el círculo.

---

## 4. Orden recomendado

1. Backend en Render → obtienes su URL.
2. Frontend en Vercel con `VITE_API_URL` = URL del backend.
3. Vuelves al backend y pones `CORS_ORIGIN` = URL del frontend.
4. Redeploy del backend. Listo.

---

## 5. Notas importantes

- **Seguridad — secretos expuestos:** el archivo `backend/.env` con credenciales reales (contraseña de Supabase, JWT_SECRET, usuario/clave de Mongo) está versionado en el repo. Antes de subir a GitHub: añádelo a `.gitignore`, **rota esas credenciales** (cámbialas en Supabase/Atlas) y configura los valores solo como variables de entorno en Render/Vercel.
- **`synchronize: true`** (en `app.module.ts`): TypeORM crea/ajusta las tablas solo al arrancar. Cómodo para el primer despliegue, pero **riesgoso en producción** porque puede alterar el esquema. Una vez estable, ponlo en `false` y maneja cambios con migraciones.
- **Plan gratis de Render:** el servicio "duerme" tras inactividad; la primera petición tras un rato puede tardar ~30s en responder. Normal.
