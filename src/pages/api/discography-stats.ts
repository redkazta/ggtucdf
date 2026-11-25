import type { APIRoute } from "astro";
import { getSpotifyDiscographyStats } from "../../lib/spotifyPublic";
import { jsonResponse } from "../../lib/http";

export const prerender = false;

export const GET: APIRoute = async () => {
  const stats = await getSpotifyDiscographyStats();

  if (stats) {
    return jsonResponse(
      {
        tracks: stats.tracks,
        source: "spotify",
        stale: stats.stale ?? false,
        fetchedAt: stats.fetchedAt,
      },
      200,
      {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      }
    );
  }

  return jsonResponse(
    {
      tracks: null,
      source: "config",
      stale: false,
    },
    200,
    { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" }
  );
};
