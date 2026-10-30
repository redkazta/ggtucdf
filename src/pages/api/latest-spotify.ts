import type { APIRoute } from "astro";
import { LATEST_RELEASE } from "../../data/siteConfig";
import { getSpotifyArtistOverview } from "../../lib/spotifyPublic";
import { jsonResponse } from "../../lib/http";

export const prerender = false;

export const GET: APIRoute = async () => {
  const overview = await getSpotifyArtistOverview();
  const latest = overview?.latestRelease;

  if (latest) {
    return jsonResponse(
      {
        id: latest.trackId,
        name: latest.trackName,
        album: latest.albumName,
        releaseDate: latest.releaseDate,
        coverUrl: latest.coverUrl,
        source: "spotify",
      },
      200,
      {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      }
    );
  }

  return jsonResponse(
    { ...LATEST_RELEASE, coverUrl: null, source: "config" },
    200,
    { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" }
  );
};
