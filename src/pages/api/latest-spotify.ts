import type { APIRoute } from "astro";
import { LATEST_RELEASE, SPOTIFY_ARTIST_ID } from "../../data/siteConfig";
import { getServerEnv } from "../../lib/env";
import { jsonResponse } from "../../lib/http";

export const prerender = false;

interface SpotifyAlbum {
  id: string;
  name: string;
  release_date?: string;
  album_type?: string;
}

interface SpotifyTrack {
  id: string | null;
  name: string;
}

interface TokenCache {
  value: string;
  expiresAt: number;
}

let tokenCache: TokenCache | undefined;

/**
 * Spotify dejó de dar acceso al catálogo de un artista (álbumes, top tracks,
 * búsqueda) a las apps nuevas: esos endpoints responden 403 aunque el token
 * sea válido. Cuando eso pasa devolvemos el lanzamiento configurado en lugar
 * de romper el endpoint.
 */
class SpotifyCatalogUnavailableError extends Error {}

function releaseDateScore(date: string | undefined): number {
  if (!date) return 0;

  const [year, month = "1", day = "1"] = date.split("-");
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

async function getAccessToken(): Promise<string | null> {
  const clientId = getServerEnv("SPOTIFY_CLIENT_ID", import.meta.env.SPOTIFY_CLIENT_ID);
  const clientSecret = getServerEnv(
    "SPOTIFY_CLIENT_SECRET",
    import.meta.env.SPOTIFY_CLIENT_SECRET
  );

  if (!clientId || !clientSecret) return null;

  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new SpotifyCatalogUnavailableError(
      `Spotify token request failed with ${response.status}`
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new SpotifyCatalogUnavailableError(
      "Spotify token response did not include an access token"
    );
  }

  const lifetimeSeconds = Math.max(60, (data.expires_in ?? 3600) - 60);
  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + lifetimeSeconds * 1000,
  };

  return tokenCache.value;
}

async function fetchJson(url: string, accessToken: string): Promise<Response> {
  return fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function findLatestRelease(): Promise<{
  id: string;
  name: string;
  album: string;
  releaseDate: string | null;
} | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const artistId =
    getServerEnv("SPOTIFY_ARTIST_ID", import.meta.env.SPOTIFY_ARTIST_ID) ??
    SPOTIFY_ARTIST_ID;

  const albumsResponse = await fetchJson(
    `https://api.spotify.com/v1/artists/${encodeURIComponent(artistId)}/albums?include_groups=album,single&limit=10&market=MX`,
    accessToken
  );

  if (!albumsResponse.ok) {
    throw new SpotifyCatalogUnavailableError(
      `Spotify albums request failed with ${albumsResponse.status}`
    );
  }

  const albumsData = (await albumsResponse.json()) as { items?: SpotifyAlbum[] };
  const albums = (albumsData.items ?? [])
    .filter((album): album is SpotifyAlbum => Boolean(album?.id))
    .sort(
      (left, right) =>
        releaseDateScore(right.release_date) - releaseDateScore(left.release_date)
    );

  // The albums endpoint returns simplified albums without tracks, so fetch
  // the tracks of the newest releases until a playable track is found.
  for (const album of albums.slice(0, 5)) {
    const tracksResponse = await fetchJson(
      `https://api.spotify.com/v1/albums/${encodeURIComponent(album.id)}/tracks?limit=10&market=MX`,
      accessToken
    );

    if (!tracksResponse.ok) continue;

    const tracksData = (await tracksResponse.json()) as { items?: SpotifyTrack[] };
    const track = (tracksData.items ?? []).find((item) => item?.id);

    if (track?.id) {
      return {
        id: track.id,
        name: track.name,
        album: album.name,
        releaseDate: album.release_date ?? null,
      };
    }
  }

  return null;
}

export const GET: APIRoute = async () => {
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
  };

  try {
    const release = await findLatestRelease();

    if (release) {
      return jsonResponse({ ...release, source: "spotify" }, 200, cacheHeaders);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[api/latest-spotify] Se usa el lanzamiento configurado:", message);
  }

  return jsonResponse({ ...LATEST_RELEASE, source: "config" }, 200, cacheHeaders);
};
