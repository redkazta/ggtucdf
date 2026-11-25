# MVP GARGUT — Estado y despliegue

## Estado actual

- Astro 6 con `@astrojs/vercel` v10.
- `output: "static"` y adapter de Vercel: las páginas públicas se prerenderizan y las rutas de API/admin se ejecutan como función serverless.
- El build de producción pasa en Vercel.
- El panel `/admin` usa una sesión firmada con HMAC en cookie `HttpOnly`; ya no hay contraseña por defecto en el código.
- `/api/fans` requiere sesión de admin.
- El registro del Drop Room valida los datos en el servidor, evita emails duplicados y escapa el HTML del correo de bienvenida.
- El reproductor de Spotify consulta el último lanzamiento y usa un track de respaldo si la API no está configurada.
- El contador se muestra en `/musica` cuando `showCountdown` es `true` en `src/data/dropConfig.ts`.

## Rutas

| Ruta | Tipo | Descripción |
| --- | --- | --- |
| `/` | Estática | Home |
| `/artista` | Estática | Biografía |
| `/musica` | Estática | Discografía, último drop y reproductor |
| `/videos` | Estática | Videos |
| `/drop-room` | Estática | Formulario de registro de fans |
| `/privacidad` | Estática | Aviso de privacidad |
| `/admin` | SSR | Panel de fans (requiere `PRIVATE_ADMIN_TOKEN`) |
| `/api/register-fan` | SSR | POST de registro |
| `/api/fans` | SSR | GET de fans (requiere sesión de admin) |
| `/api/latest-spotify` | SSR | Último lanzamiento de Spotify |
| `/api/admin-login` | SSR | Login del panel |
| `/api/admin-logout` | SSR | Logout del panel |

## Variables de entorno

Configúralas en **Vercel → Project → Settings → Environment Variables** para
Production (y Preview si quieres probar ramas). También puedes usar un `.env`
local para desarrollo.

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | Sí | URL del proyecto de Supabase (`https://xxxx.supabase.co`) |
| `PRIVATE_SUPABASE_SERVICE_ROLE_KEY` | Sí | Service role key; solo se usa en el servidor |
| `PRIVATE_ADMIN_TOKEN` | Sí | Contraseña/token del panel; mínimo 8 caracteres, ideal 32+ |
| `SPOTIFY_CLIENT_ID` | Para Spotify dinámico | Client ID de la app de Spotify |
| `SPOTIFY_CLIENT_SECRET` | Para Spotify dinámico | Client Secret de Spotify |
| `SPOTIFY_ARTIST_ID` | No | Si se omite, se usa el artista de `src/data/siteConfig.ts` |
| `PRIVATE_RESEND_API_KEY` | No | API key de Resend para el correo de bienvenida |
| `PRIVATE_RESEND_FROM_EMAIL` | No | Remitente verificado en Resend |

Genera el token del admin con Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Si falta `PRIVATE_ADMIN_TOKEN`, `/admin` muestra un aviso y no permite entrar.
Si faltan las variables de Supabase, el registro responde `503`. Si faltan las
de Spotify, `/api/latest-spotify` responde `503` y el reproductor usa el track
de respaldo. Si faltan las de Resend, el registro funciona pero no envía correo.

## Base de datos (Supabase)

Ejecuta el contenido de `supabase/fans_gargut.sql` en el **SQL Editor** de
Supabase. El script:

- Crea la tabla `fans_gargut`.
- Usa `CITEXT` y un índice único por `lower(email)` para evitar duplicados.
- Activa RLS. Las API routes usan la service role key, que omite RLS.

Si la tabla ya existía con `email TEXT`, aplica manualmente:

```sql
ALTER TABLE fans_gargut ALTER COLUMN email TYPE CITEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fans_gargut_email_lower
  ON fans_gargut(lower(email));
```

## Spotify

1. Crea una app en <https://developer.spotify.com/dashboard>.
2. Copia el Client ID y el Client Secret a Vercel.
3. El endpoint usa el flujo Client Credentials y busca el lanzamiento más
   reciente del artista configurado.

## Resend (opcional)

1. Crea una cuenta en <https://resend.com>.
2. Verifica el dominio remitente.
3. Agrega `PRIVATE_RESEND_API_KEY` y `PRIVATE_RESEND_FROM_EMAIL`.

El correo de bienvenida es opcional: si Resend falla, el registro se conserva.

## Despliegue

1. Agrega las variables en Vercel.
2. Haz commit y push a `main`.
3. Vercel compila con `npm run build` y publica `.vercel/output`.
4. Verifica:

```bash
# Debe devolver 200 con el formulario
curl -I https://www.garguttieneunchingodeferia.com/drop-room

# Sin sesión debe devolver 401
curl -i https://www.garguttieneunchingodeferia.com/api/fans

# Con Spotify configurado debe devolver 200 y un trackId
curl -i https://www.garguttieneunchingodeferia.com/api/latest-spotify

# Con el token configurado debe mostrar el formulario de login
curl -s https://www.garguttieneunchingodeferia.com/admin | grep -o 'name="password"'
```

## Pruebas locales

```bash
cp .env.example .env
# Completa .env con tus valores
npm install
npm run dev
```

- `/admin` debe mostrar el login si `PRIVATE_ADMIN_TOKEN` está definido.
- Sin sesión, `/api/fans` debe responder `401`.
- Con Supabase configurado, un POST válido a `/api/register-fan` debe responder
  `201`; un email repetido debe responder `409`.

## Notas de seguridad

- No publiques `PRIVATE_SUPABASE_SERVICE_ROLE_KEY`, `PRIVATE_ADMIN_TOKEN`,
  `SPOTIFY_CLIENT_SECRET` ni `PRIVATE_RESEND_API_KEY`.
- La service role key solo se usa en rutas server-side.
- La cookie del admin es `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
- `/admin` está excluido del sitemap y lleva `X-Robots-Tag: noindex`.
