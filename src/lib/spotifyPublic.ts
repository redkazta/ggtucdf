import { SPOTIFY_ARTIST_ID } from "../data/siteConfig";

/**
 * Datos públicos de Spotify sin OAuth.
 *
 * La API Web oficial ya no da acceso al catálogo de un artista a las apps
 * nuevas (responde 403), y tampoco expone oyentes mensuales ni reproducciones.
 * El reproductor web sí publica esos datos en su API interna, así que los
 * leemos desde ahí: primero el token anónimo que viene en el embed del
 * artista y luego la operación `queryArtistOverview` del web player.
 *
 * Es una integración no oficial: si Spotify cambia el hash de la operación o
 * bloquea la petición, estas funciones devuelven `null` y el sitio sigue
 * mostrando los valores de `siteConfig.ts`.
 */

const EMBED_BASE = "https://open.spotify.com/embed";
const PARTNER_URL = "https://api-partner.spotify.com/pathfinder/v1/query";

/** Hash de `queryArtistOverview` en el build actual del web player. */
const ARTIST_OVERVIEW_HASH =
  "9f8134ef565e78621f1e1793555bd6633c5ac144ae0f89604ed3ae3f80b3c8e6";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 8000;
const OVERVIEW_TTL_MS = 30 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;

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

export interface SpotifyArtistOverview {
  monthlyListeners: number | null;
  followers: number | null;
  topTrack: string | null;
  latestRelease: SpotifyLatestRelease | null;
  fetchedAt: string;
}

let tokenCache: CacheEntry<string> | undefined;
let overviewCache: CacheEntry<SpotifyArtistOverview> | undefined;
let failureUntil = 0;

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

async function getAnonymousToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
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

interface AlbumEmbedTrack {
  uri?: string;
  title?: string;
}

async function getFirstTrack(albumId: string): Promise<string | null> {
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

export async function getSpotifyArtistOverview(): Promise<SpotifyArtistOverview | null> {
  if (overviewCache && Date.now() < overviewCache.expiresAt) {
    return overviewCache.value;
  }

  if (Date.now() < failureUntil) {
    return null;
  }

  try {
    const token = await getAnonymousToken();

    const variables = {
      uri: `spotify:artist:${SPOTIFY_ARTIST_ID}`,
      locale: "",
      includePrerelease: true,
    };
    const extensions = {
      persistedQuery: { version: 1, sha256Hash: ARTIST_OVERVIEW_HASH },
    };

    const url =
      `${PARTNER_URL}?operationName=queryArtistOverview` +
      `&variables=${encodeURIComponent(JSON.stringify(variables))}` +
      `&extensions=${encodeURIComponent(JSON.stringify(extensions))}`;

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        "app-platform": "WebPlayer",
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Spotify GraphQL respondió ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: {
        artistUnion?: {
          stats?: { monthlyListeners?: number; followers?: number };
          discography?: {
            topTracks?: { items?: { track?: { name?: string } }[] };
            latest?: {
              id?: string;
              name?: string;
              date?: { year?: number; month?: number; day?: number };
              coverArt?: { sources?: { url?: string; width?: number }[] };
            };
          };
        };
      };
    };

    const artist = payload.data?.artistUnion;

    if (!artist) {
      throw new Error("Spotify no devolvió el perfil del artista");
    }

    const latest = artist.discography?.latest;
    let latestRelease: SpotifyLatestRelease | null = null;

    if (latest?.id) {
      const trackId = await getFirstTrack(latest.id).catch(() => null);
      const cover = [...(latest.coverArt?.sources ?? [])]
        .filter((source) => Boolean(source?.url))
        .sort((left, right) => (right.width ?? 0) - (left.width ?? 0))[0];

      if (trackId) {
        latestRelease = {
          trackId,
          trackName: latest.name ?? "",
          albumName: latest.name ?? "",
          releaseDate: formatReleaseDate(latest.date),
          coverUrl: cover?.url ?? null,
        };
      }
    }

    const overview: SpotifyArtistOverview = {
      monthlyListeners: artist.stats?.monthlyListeners ?? null,
      followers: artist.stats?.followers ?? null,
      topTrack: artist.discography?.topTracks?.items?.[0]?.track?.name ?? null,
      latestRelease,
      fetchedAt: new Date().toISOString(),
    };

    overviewCache = { value: overview, expiresAt: Date.now() + OVERVIEW_TTL_MS };
    return overview;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[spotify-public] No se pudieron leer los datos públicos:", message);
    failureUntil = Date.now() + FAILURE_TTL_MS;
    return null;
  }
}

function formatReleaseDate(date?: { year?: number; month?: number; day?: number }) {
  if (!date?.year) return null;
  const month = String(date.month ?? 1).padStart(2, "0");
  const day = String(date.day ?? 1).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}
