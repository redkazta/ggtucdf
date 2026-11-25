import { DISCOGRAPHY, SPOTIFY_ARTIST_ID } from "../data/siteConfig";

/**
 * Datos públicos de Spotify sin OAuth.
 *
 * La API Web oficial ya no da acceso al catálogo de un artista a las apps
 * nuevas (responde 403), y tampoco expone oyentes mensuales ni reproducciones.
 * El reproductor web sí publica esos datos en su API interna, así que los
 * leemos desde ahí: primero el token anónimo que viene en el embed del
 * artista y luego las operaciones `queryArtistOverview` y `queryAlbumTracks`
 * del web player.
 *
 * Para que los números no se queden congelados cuando Spotify rota el hash de
 * una operación, este módulo:
 *   1. Usa el hash persistido conocido.
 *   2. Si falla, descubre el hash vigente leyendo el bundle del web player.
 *   3. Si falla la sesión, renueva el token anónimo y reintenta.
 *   4. Si todo lo anterior falla, conserva el último dato bueno en memoria y lo
 *      sirve como `stale` (nunca retrocede a valores más viejos).
 *   5. Como último recurso consulta la API oficial (Client Credentials) para
 *      seguidores y top track.
 *
 * Es una integración no oficial: si Spotify bloquea la petición, el sitio
 * sigue mostrando los valores de `siteConfig.ts`.
 */

const EMBED_BASE = "https://open.spotify.com/embed";
const PARTNER_URL = "https://api-partner.spotify.com/pathfinder/v1/query";
const OFFICIAL_API = "https://api.spotify.com/v1";

/** Hashes de las operaciones persistidas en el build actual del web player. */
const OPERATION_HASHES: Record<string, string> = {
  queryArtistOverview:
    "9f8134ef565e78621f1e1793555bd6633c5ac144ae0f89604ed3ae3f80b3c8e6",
  queryAlbumTracks:
    "0b6ce3511e1b02e4a40fa95440f992acbe85080eb308af9194322d708fc1914f",
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 12_000;
const OVERVIEW_TTL_MS = 30 * 60 * 1000;
const DISCOGRAPHY_TTL_MS = 30 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;
const HASH_DISCOVERY_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface SpotifyLatestRelease {
  trackId: string;
  trackName: string;
  albumName: string;
  releaseDate: string | null;
  coverUrl: string | null;
}

export interface SpotifyTrackStat {
  name: string;
  playcount: number | null;
}

export interface SpotifyArtistOverview {
  monthlyListeners: number | null;
  followers: number | null;
  topTrack: string | null;
  topCities: { city: string; country: string; listeners: number }[];
  topTracks: SpotifyTrackStat[];
  latestRelease: SpotifyLatestRelease | null;
  fetchedAt: string;
  stale?: boolean;
  sources?: string[];
}

export interface SpotifyReleasePlaycount {
  title: string;
  albumId: string;
  playcount: number;
}

export interface SpotifyDiscographyStats {
  tracks: SpotifyReleasePlaycount[];
  fetchedAt: string;
  stale?: boolean;
}

interface ArtistUnionPayload {
  stats?: {
    monthlyListeners?: number;
    followers?: number;
    topCities?: {
      items?: { city?: string; country?: string; numberOfListeners?: number }[];
    };
  };
  discography?: {
    topTracks?: {
      items?: { track?: { name?: string; playcount?: string } }[];
    };
    latest?: {
      id?: string;
      name?: string;
      date?: { year?: number; month?: number; day?: number };
      coverArt?: { sources?: { url?: string; width?: number }[] };
    };
  };
}

interface AlbumUnionPayload {
  tracksV2?: {
    items?: {
      track?: {
        uri?: string;
        name?: string;
        playcount?: string;
      };
    }[];
  };
}

let tokenCache: CacheEntry<string> | undefined;
let overviewCache: CacheEntry<SpotifyArtistOverview> | undefined;
let discographyCache: CacheEntry<SpotifyDiscographyStats> | undefined;
let hashDiscoveryCache = new Map<string, CacheEntry<string>>();
let officialTokenCache: CacheEntry<string> | undefined;
let lastOverview: SpotifyArtistOverview | null = null;
let lastDiscography: SpotifyDiscographyStats | null = null;
let failureUntil = 0;
let discographyFailureUntil = 0;

/** Error de autenticación: conviene renovar el token y reintentar. */
class SpotifyAuthError extends Error {}
/** Error de hash persistido: conviene descubrir el hash vigente. */
class SpotifyHashError extends Error {}

function readNextData(html: string): unknown {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function fetchText(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, ...headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Spotify respondió ${response.status} en ${url}`);
  }

  return response.text();
}

async function getAnonymousToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }

  const html = await fetchText(`${EMBED_BASE}/artist/${SPOTIFY_ARTIST_ID}`);
  const data = readNextData(html) as
    | {
        props?: {
          pageProps?: {
            state?: {
              settings?: {
                session?: {
                  accessToken?: string;
                  accessTokenExpirationTimestampMs?: number;
                };
              };
            };
          };
        };
      }
    | null;

  const session = data?.props?.pageProps?.state?.settings?.session;
  const token = session?.accessToken;

  if (!token) {
    throw new Error("El embed de Spotify no incluyó un token anónimo");
  }

  const expiresAt = session?.accessTokenExpirationTimestampMs;
  const ttlMs =
    typeof expiresAt === "number"
      ? Math.max(60_000, expiresAt - Date.now() - 60_000)
      : 30 * 60 * 1000;

  tokenCache = { value: token, expiresAt: Date.now() + ttlMs };
  return token;
}

/**
 * Lee el bundle principal del web player y extrae el hash persistido de una
 * operación. Solo se ejecuta si el hash conocido deja de funcionar.
 */
async function discoverOperationHash(operationName: string): Promise<string | null> {
  const cached = hashDiscoveryCache.get(operationName);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  try {
    const page = await fetchText(`https://open.spotify.com/artist/${SPOTIFY_ARTIST_ID}`);
    const bundles = Array.from(
      page.matchAll(
        /https:\/\/open\.spotifycdn\.com\/cdn\/build\/web-player\/web-player\.[a-z0-9]+\.js/g
      )
    ).map((match) => match[0]);

    const pattern = new RegExp(
      `${operationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}","query","([0-9a-f]{64})"`
    );

    for (const bundle of bundles.slice(0, 3)) {
      try {
        const js = await fetchText(bundle);
        const match = js.match(pattern);
        if (match) {
          hashDiscoveryCache.set(operationName, {
            value: match[1],
            expiresAt: Date.now() + HASH_DISCOVERY_TTL_MS,
          });
          return match[1];
        }
      } catch {
        // Probamos el siguiente bundle.
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[spotify-public] No se pudo descubrir el hash:", message);
  }

  return null;
}

function getOperationHash(operationName: string): string {
  const cached = hashDiscoveryCache.get(operationName);
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  return OPERATION_HASHES[operationName] ?? "";
}

interface PartnerPayload<T> {
  data?: T;
  errors?: { message?: string }[];
}

async function queryPartner<T>(
  operationName: string,
  hash: string,
  variables: Record<string, unknown>
): Promise<T> {
  const extensions = {
    persistedQuery: { version: 1, sha256Hash: hash },
  };

  const url =
    `${PARTNER_URL}?operationName=${encodeURIComponent(operationName)}` +
    `&variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&extensions=${encodeURIComponent(JSON.stringify(extensions))}`;

  const token = await getAnonymousToken();
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      "app-platform": "WebPlayer",
      accept: "application/json",
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401 || response.status === 403) {
    throw new SpotifyAuthError(`Spotify GraphQL respondió ${response.status}`);
  }

  if (response.status === 400 || response.status === 404) {
    throw new SpotifyHashError(`Spotify GraphQL respondió ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`Spotify GraphQL respondió ${response.status}`);
  }

  const payload = (await response.json()) as PartnerPayload<T>;

  if (payload.errors?.length || !payload.data) {
    const message = payload.errors?.[0]?.message ?? "respuesta sin datos";
    if (/persisted|hash|not found/i.test(message)) {
      throw new SpotifyHashError(message);
    }
    throw new Error(message);
  }

  return payload.data;
}

async function queryWithRetry<T>(
  operationName: string,
  variables: Record<string, unknown>
): Promise<T> {
  let hash = getOperationHash(operationName);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await queryPartner<T>(operationName, hash, variables);
    } catch (error) {
      if (error instanceof SpotifyAuthError) {
        tokenCache = undefined;
        continue;
      }

      if (error instanceof SpotifyHashError && attempt === 0) {
        const freshHash = await discoverOperationHash(operationName);
        if (freshHash && freshHash !== hash) {
          hash = freshHash;
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error(`Spotify no aceptó ninguna sesión ni hash para ${operationName}`);
}

interface AlbumTrack {
  id: string;
  name: string;
  playcount: number | null;
}

async function fetchAlbumTracks(albumId: string): Promise<AlbumTrack[]> {
  const data = await queryWithRetry<{ albumUnion?: AlbumUnionPayload }>("queryAlbumTracks", {
    uri: `spotify:album:${albumId}`,
    offset: 0,
    limit: 50,
  });

  return (data.albumUnion?.tracksV2?.items ?? [])
    .map((item) => {
      const track = item?.track;
      const id = track?.uri?.split(":").pop() ?? "";
      const playcount =
        typeof track?.playcount === "string" && track.playcount !== ""
          ? Number(track.playcount)
          : null;

      return {
        id: /^[A-Za-z0-9]{22}$/.test(id) ? id : "",
        name: track?.name ?? "",
        playcount: playcount !== null && Number.isFinite(playcount) ? playcount : null,
      };
    })
    .filter((track) => Boolean(track.id));
}

interface AlbumEmbedTrack {
  uri?: string;
  title?: string;
}

/** Respaldo vía embed HTML si la operación GraphQL del álbum falla. */
async function getFirstTrackFromEmbed(albumId: string): Promise<string | null> {
  const html = await fetchText(`${EMBED_BASE}/album/${albumId}`);
  const data = readNextData(html) as
    | {
        props?: {
          pageProps?: {
            state?: { data?: { entity?: { trackList?: AlbumEmbedTrack[] } } };
          };
        };
      }
    | null;

  const tracks = data?.props?.pageProps?.state?.data?.entity?.trackList ?? [];
  const uri = tracks.find((track) => track?.uri?.startsWith("spotify:track:"))?.uri;
  const trackId = uri?.split(":").pop();

  return trackId && /^[A-Za-z0-9]{22}$/.test(trackId) ? trackId : null;
}

async function buildOverview(artist: ArtistUnionPayload): Promise<SpotifyArtistOverview> {
  const latest = artist.discography?.latest;
  let latestRelease: SpotifyLatestRelease | null = null;

  if (latest?.id) {
    let trackId: string | null = null;

    try {
      const tracks = await fetchAlbumTracks(latest.id);
      trackId = tracks[0]?.id ?? null;
    } catch {
      trackId = await getFirstTrackFromEmbed(latest.id).catch(() => null);
    }

    if (trackId) {
      const cover = [...(latest.coverArt?.sources ?? [])]
        .filter((source) => Boolean(source?.url))
        .sort((left, right) => (right.width ?? 0) - (left.width ?? 0))[0];

      latestRelease = {
        trackId,
        trackName: latest.name ?? "",
        albumName: latest.name ?? "",
        releaseDate: formatReleaseDate(latest.date),
        coverUrl: cover?.url ?? null,
      };
    }
  }

  const topTracks: SpotifyTrackStat[] = (artist.discography?.topTracks?.items ?? [])
    .map((item) => {
      const playcount =
        typeof item?.track?.playcount === "string" && item.track.playcount !== ""
          ? Number(item.track.playcount)
          : null;

      return {
        name: item?.track?.name ?? "",
        playcount: playcount !== null && Number.isFinite(playcount) ? playcount : null,
      };
    })
    .filter((track) => Boolean(track.name));

  return {
    monthlyListeners: artist.stats?.monthlyListeners ?? null,
    followers: artist.stats?.followers ?? null,
    topTrack: artist.discography?.topTracks?.items?.[0]?.track?.name ?? null,
    topCities: (artist.stats?.topCities?.items ?? [])
      .filter((item) => Boolean(item?.city) && typeof item?.numberOfListeners === "number")
      .map((item) => ({
        city: item.city as string,
        country: item.country ?? "",
        listeners: item.numberOfListeners as number,
      })),
    topTracks,
    latestRelease,
    fetchedAt: new Date().toISOString(),
    sources: ["web-player"],
  };
}

/**
 * Respaldo con la API oficial (Client Credentials). No da oyentes mensuales ni
 * playcounts, pero sí seguidores y top track cuando la capa pública falla.
 */
async function getOfficialFallback(): Promise<{
  followers: number | null;
  topTrack: string | null;
} | null> {
  const clientId = import.meta.env.SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    if (!officialTokenCache || Date.now() >= officialTokenCache.expiresAt) {
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!tokenResponse.ok) return null;

      const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
      if (!tokenPayload.access_token) return null;

      officialTokenCache = {
        value: tokenPayload.access_token,
        expiresAt: Date.now() + 50 * 60 * 1000,
      };
    }

    const headers = { Authorization: `Bearer ${officialTokenCache.value}` };
    const [artistResponse, topResponse] = await Promise.all([
      fetch(`${OFFICIAL_API}/artists/${SPOTIFY_ARTIST_ID}`, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
      fetch(`${OFFICIAL_API}/artists/${SPOTIFY_ARTIST_ID}/top-tracks?market=MX`, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
    ]);

    const followers = artistResponse.ok
      ? ((await artistResponse.json()) as { followers?: { total?: number } }).followers
          ?.total ?? null
      : null;

    const topTrack = topResponse.ok
      ? ((await topResponse.json()) as { tracks?: { name?: string }[] }).tracks?.[0]
          ?.name ?? null
      : null;

    if (followers === null && topTrack === null) return null;

    return { followers, topTrack };
  } catch {
    return null;
  }
}

export async function getSpotifyArtistOverview(): Promise<SpotifyArtistOverview | null> {
  if (overviewCache && Date.now() < overviewCache.expiresAt) {
    return overviewCache.value;
  }

  if (Date.now() < failureUntil) {
    return lastOverview ? { ...lastOverview, stale: true } : null;
  }

  try {
    const data = await queryWithRetry<{ artistUnion?: ArtistUnionPayload }>(
      "queryArtistOverview",
      {
        uri: `spotify:artist:${SPOTIFY_ARTIST_ID}`,
        locale: "",
        includePrerelease: true,
      }
    );

    if (!data.artistUnion) {
      throw new Error("Spotify no devolvió el perfil del artista");
    }

    const overview = await buildOverview(data.artistUnion);

    overviewCache = { value: overview, expiresAt: Date.now() + OVERVIEW_TTL_MS };
    lastOverview = overview;
    return overview;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[spotify-public] No se pudieron leer los datos públicos:", message);

    failureUntil = Date.now() + FAILURE_TTL_MS;
    const official = await getOfficialFallback();

    if (lastOverview) {
      const merged: SpotifyArtistOverview = {
        ...lastOverview,
        followers: official?.followers ?? lastOverview.followers,
        topTrack: official?.topTrack ?? lastOverview.topTrack,
        stale: true,
        sources: official
          ? [...(lastOverview.sources ?? []), "official"]
          : lastOverview.sources,
      };
      lastOverview = merged;
      return merged;
    }

    if (official) {
      const overview: SpotifyArtistOverview = {
        monthlyListeners: null,
        followers: official.followers,
        topTrack: official.topTrack,
        topCities: [],
        topTracks: [],
        latestRelease: null,
        fetchedAt: new Date().toISOString(),
        stale: true,
        sources: ["official"],
      };
      lastOverview = overview;
      return overview;
    }

    return null;
  }
}

/**
 * Playcounts reales por lanzamiento. Recorre los álbumes del catálogo local,
 * suma las reproducciones de sus tracks y conserva el último resultado bueno
 * si Spotify falla.
 */
export async function getSpotifyDiscographyStats(): Promise<SpotifyDiscographyStats | null> {
  if (discographyCache && Date.now() < discographyCache.expiresAt) {
    return discographyCache.value;
  }

  if (Date.now() < discographyFailureUntil) {
    return lastDiscography ? { ...lastDiscography, stale: true } : null;
  }

  const releases = DISCOGRAPHY.map((track) => {
    const albumId = /\/album\/([A-Za-z0-9]{22})/.exec(track.spotifyUrl)?.[1] ?? "";
    return { title: track.title, albumId };
  }).filter((release) => Boolean(release.albumId));

  if (releases.length === 0) return null;

  const results = await Promise.all(
    releases.map(async (release) => {
      try {
        const tracks = await fetchAlbumTracks(release.albumId);
        const total = tracks.reduce(
          (sum, track) => sum + (typeof track.playcount === "number" ? track.playcount : 0),
          0
        );

        if (tracks.length === 0) return null;

        return {
          title: release.title,
          albumId: release.albumId,
          playcount: total,
        } satisfies SpotifyReleasePlaycount;
      } catch {
        return null;
      }
    })
  );

  const tracks = results.filter((item): item is SpotifyReleasePlaycount => Boolean(item));

  if (tracks.length === 0) {
    discographyFailureUntil = Date.now() + FAILURE_TTL_MS;
    return lastDiscography ? { ...lastDiscography, stale: true } : null;
  }

  const stats: SpotifyDiscographyStats = {
    tracks,
    fetchedAt: new Date().toISOString(),
  };

  discographyCache = { value: stats, expiresAt: Date.now() + DISCOGRAPHY_TTL_MS };
  lastDiscography = stats;
  return stats;
}

function formatReleaseDate(date?: { year?: number; month?: number; day?: number }) {
  if (!date?.year) return null;
  const month = String(date.month ?? 1).padStart(2, "0");
  const day = String(date.day ?? 1).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}
