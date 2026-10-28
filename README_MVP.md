# MVP GARGUT — Estado y despliegue

## Estado actual

- Astro 6 con `@astrojs/vercel` v10.
- `output: "static"` y adapter de Vercel: las páginas públicas se prerenderizan y las rutas de API/admin se ejecutan como función serverless.
- El build de producción pasa en Vercel.
- El panel `/admin` usa una sesión firmada con HMAC en cookie `HttpOnly`; ya no hay contraseña por defecto en el código.
- `/api/fans` requiere sesión de admin.
- El registro del Drop Room valida los datos en el servidor, evita emails duplicados y escapa el HTML del correo de bienvenida.
- El reproductor de Spotify consulta el último lanzamiento y usa un track de respaldo si la API no está configurada.
- El último drop y el contador se guardan en Supabase (`drop_settings`) y se editan desde `/admin` o desde el ERP. `/musica` los actualiza sin redeploy.
- Por ahora `show_countdown = false`: `/musica` muestra “Último drop”. El contador se activa desde `/admin`.

## Rutas

| Ruta | Tipo | Descripción |
| --- | --- | --- |
| `/` | Estática | Home |
| `/artista` | Estática | Biografía |
| `/musica` | Estática | Discografía, último drop y reproductor |
| `/videos` | Estática | Videos |
| `/drop-room` | Estática | Formulario de registro de fans |
| `/privacidad` | Estática | Aviso de privacidad |
| `/admin` | SSR | Panel de fans y ajustes del drop (requiere `PRIVATE_ADMIN_TOKEN`) |
| `/api/register-fan` | SSR | POST de registro |
| `/api/fans` | SSR | GET de fans (requiere sesión de admin) |
| `/api/latest-spotify` | SSR | Último lanzamiento de Spotify |
| `/api/drop-config` | SSR | Configuración pública del drop (sin auth) |
| `/api/drop-settings` | SSR | GET/POST de ajustes (cookie admin o Bearer del ERP) |
| `/api/admin-login` | SSR | Login del panel |
| `/api/admin-logout` | SSR | Logout del panel |

## Variables de entorno

Configúralas en **Vercel → Project → Settings → Environment Variables** para
Production (y Preview si quieres probar ramas). También puedes usar un `.env`
local para desarrollo.

| Variable | Obligatoria | Uso y origen |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | Sí | URL del proyecto. Supabase → Project Settings → API → Project URL. |
| `PRIVATE_SUPABASE_SERVICE_ROLE_KEY` | Sí | Supabase → Project Settings → API → `service_role` secret. Solo server-side. |
| `PRIVATE_ADMIN_TOKEN` | Sí | Lo generas tú. Es la contraseña de `/admin`. Mínimo 8 caracteres, ideal 32+. |
| `PRIVATE_ERP_API_TOKEN` | No | Lo generas tú. Bearer para el ERP. Si se omite, se usa `PRIVATE_ADMIN_TOKEN`. |
| `SPOTIFY_CLIENT_ID` | Para Spotify dinámico | Spotify Developer Dashboard → tu app → Settings → Client ID. |
| `SPOTIFY_CLIENT_SECRET` | Para Spotify dinámico | Spotify Developer Dashboard → tu app → Settings → Client Secret. |
| `SPOTIFY_ARTIST_ID` | No | ID del artista. Si se omite, se usa el de `src/data/siteConfig.ts`. |
| `PRIVATE_RESEND_API_KEY` | No | Resend → API Keys → Create API Key. |
| `PRIVATE_RESEND_FROM_EMAIL` | No | Remitente verificado en Resend, por ejemplo `Gargut <noreply@tudominio.com>`. |

Genera los tokens con Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O con OpenSSL:

```bash
openssl rand -hex 32
```

Usa un valor distinto para `PRIVATE_ADMIN_TOKEN` y `PRIVATE_ERP_API_TOKEN`.
En Vercel marca como **Sensitive** las variables `PRIVATE_*` y
`PRIVATE_SUPABASE_SERVICE_ROLE_KEY`. Solo `PUBLIC_SUPABASE_URL` puede ser
pública. Después de agregar o cambiar variables hay que hacer un nuevo deploy.

Si falta `PRIVATE_ADMIN_TOKEN`, `/admin` muestra un aviso y no permite entrar.
Si faltan las variables de Supabase, el registro responde `503`. Si faltan las
de Spotify, `/api/latest-spotify` responde `503` y el reproductor usa el track
de respaldo. Si faltan las de Resend, el registro funciona pero no envía correo.

## Base de datos (Supabase)

Ejecuta estos scripts en el **SQL Editor** de Supabase, en este orden:

1. `supabase/fans_gargut.sql` — tabla `fans_gargut` (si aún no existe).
2. `supabase/drop_settings.sql` — tabla `drop_settings` para el último drop y el contador.

`fans_gargut.sql`:

- Crea la tabla `fans_gargut`.
- Usa `CITEXT` y un índice único por `lower(email)` para evitar duplicados.
- Activa RLS. Las API routes usan la service role key, que omite RLS.

`drop_settings.sql`:

- Crea una fila única (`id = 1`) con el último drop, el próximo drop y
  `show_countdown`.
- Activa RLS sin políticas: solo la service role key puede leer/escribir.
- Deja `show_countdown = false` para mostrar el último drop.

Si `fans_gargut` ya existía con `email TEXT`, aplica manualmente:

```sql
ALTER TABLE fans_gargut ALTER COLUMN email TYPE CITEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fans_gargut_email_lower
  ON fans_gargut(lower(email));
```

## Drop / ERP

### Desde `/admin`

Después de entrar a `/admin`, la sección **Drop / ERP** permite editar:

- Nombre y URL del último drop.
- Nombre del próximo drop.
- Fecha del próximo drop (hora de Guadalajara, UTC-6).
- Mostrar u ocultar el contador.

Al guardar, `/musica` consulta `/api/drop-config` y se actualiza en menos de
30 segundos, sin redeploy. Si el contador está desactivado, muestra el último
drop. Si está activado y la fecha es futura, muestra el contador.

### Desde el ERP

El ERP puede leer y escribir los ajustes con el Bearer token. No necesita
cookies ni sesión de navegador.

```bash
# Leer ajustes
curl -s https://www.garguttieneunchingodeferia.com/api/drop-settings \
  -H "Authorization: Bearer $PRIVATE_ERP_API_TOKEN"

# Guardar ajustes
curl -X POST https://www.garguttieneunchingodeferia.com/api/drop-settings \
  -H "Authorization: Bearer $PRIVATE_ERP_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latestReleaseName": "Yo te kiero solo",
    "latestReleaseUrl": "https://open.spotify.com/track/4KvIxXUbDzMicaBr2opF9e",
    "nextDropName": "FENTATRIP",
    "nextDropDate": "2026-11-15T00:00:00-06:00",
    "showCountdown": false
  }'
```

- `nextDropDate` acepta ISO 8601 con zona (`2026-11-15T00:00:00-06:00`) o
  `YYYY-MM-DDTHH:mm` interpretado como hora de Guadalajara (UTC-6).
- `showCountdown: true` exige nombre y fecha del próximo drop.
- `GET /api/drop-settings` responde `401` sin token y `503` si Supabase no está
  configurado.
- `GET /api/drop-config` es público y siempre responde `200`; si Supabase falla,
  devuelve los valores de respaldo de `src/data/dropConfig.ts`.

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

1. Ejecuta los scripts de Supabase.
2. Agrega las variables en Vercel.
3. Haz commit y push a `main`.
4. Vercel compila con `npm run build` y publica `.vercel/output`.
5. Verifica:

```bash
# Config pública del drop (200, incluso sin Supabase)
curl -i https://www.garguttieneunchingodeferia.com/api/drop-config

# Sin token debe devolver 401
curl -i https://www.garguttieneunchingodeferia.com/api/drop-settings

# Con token del ERP debe devolver 200
curl -i https://www.garguttieneunchingodeferia.com/api/drop-settings \
  -H "Authorization: Bearer $PRIVATE_ERP_API_TOKEN"

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
- `/admin` debe mostrar la sección **Drop / ERP** después de entrar.
- Sin sesión, `/api/fans` debe responder `401`.
- Con Supabase configurado, un POST válido a `/api/register-fan` debe responder
  `201`; un email repetido debe responder `409`.
- `/api/drop-config` debe responder `200` con los valores de `drop_settings`.

## Notas de seguridad

- No publiques `PRIVATE_SUPABASE_SERVICE_ROLE_KEY`, `PRIVATE_ADMIN_TOKEN`,
  `PRIVATE_ERP_API_TOKEN`, `SPOTIFY_CLIENT_SECRET` ni `PRIVATE_RESEND_API_KEY`.
- La service role key solo se usa en rutas server-side.
- La cookie del admin es `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
- `/admin` está excluido del sitemap y lleva `X-Robots-Tag: noindex`.
