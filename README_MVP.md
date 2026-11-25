# MVP GARGUT — Resumen de implementación

## ✅ Lo que se hizo

1. **Base de datos** (`supabase/fans_gargut.sql`) — Tabla `fans_gargut` creada.
2. **Configuración** (`src/data/dropConfig.ts`) — Configuración del drop y contador.
3. **Supabase Client** (`src/lib/supabase.ts`) — Cliente server-side con service_role.
4. **Toast** (`src/lib/toast.ts`) — Notificaciones simples.
5. **Drop Room** (`src/components/DropRoomForm.astro`) — Formulario con validación y envío a `/api/register-fan`.
6. **API Register** (`src/pages/api/register-fan.ts`) — Inserta en Supabase + envía email con Resend.
7. **API Fans** (`src/pages/api/fans.ts`) — Lista todos los fans para el admin.
8. **Admin** (`src/pages/admin.astro` + `AdminTable.astro`) — Panel protegido con contraseña simple, tabla responsive, botón "Copiar WhatsApp" y "Copiar todos".
9. **Spotify Dinámico** (`src/pages/api/latest-spotify.ts` + `SpotifyLatestPlayer.astro`) — Consulta la API de Spotify (Client Credentials) y genera el iframe dinámicamente.
10. **Contador** (`src/components/DropCountdown.astro`) — Muestra el último drop o el contador regresivo según `dropConfig`.
11. **Branding** (`ArtistLayout.astro`) — Enlace a WildForgeLabs en el footer de todas las páginas.
12. **Site Config** (`siteConfig.ts`) — Añadido `SPOTIFY_ARTIST_ID`.
13. **Música** (`musica.astro`) — Reemplazado el iframe estático por `SpotifyLatestPlayer` y `DropCountdown`.
14. **Variables de entorno** (`.env.example`) — Ejemplo completo.

## ⚠️ Lo que DEBES hacer tú (porque no puedo ejecutar en este entorno)

1. **Instalar dependencias:**
   ```bash
   npm install @supabase/supabase-js resend
   ```

2. **Crear la tabla en Supabase:** Copiar el contenido de `supabase/fans_gargut.sql` y ejecutarlo en el SQL Editor de Supabase.

3. **Configurar `.env`:** Copiar `.env.example` a `.env` y llenar con tus valores reales.

4. **Crear la cuenta de Resend:** Obtener la API key y configurar el `from` email.

5. **Configurar Spotify:** Crear una app en Spotify Developer, obtener Client ID y Secret.

6. **Probar localmente:**
   ```bash
   npm run dev
   ```

7. **Desplegar en Vercel:**
   ```bash
   vercel --prod
   ```

## 🔗 Rutas nuevas

- `/api/register-fan` — POST (registro de fans)
- `/api/fans` — GET (lista fans para admin)
- `/api/latest-spotify` — GET (último lanzamiento)
- `/admin` — Panel de administración

## 📝 Notas importantes

- El admin usa una contraseña simple (`gargut123` por defecto, o la que pongas en `.env`). En producción, reemplazar por Supabase Auth.
- El reproductor de Spotify consulta la API en cada carga de página (client-side fetch a tu propio endpoint). Esto mantiene el iframe actualizado sin romper la estética.
- El contador (`DropCountdown`) se activa cambiando `showCountdown: true` en `src/data/dropConfig.ts`.
