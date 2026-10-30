import type { APIRoute } from "astro";
import {
  ARTIST_FOLLOWERS,
  ARTIST_MONTHLY_LISTENERS,
  ARTIST_TOP_TRACK,
  LATEST_RELEASE,
} from "../../data/siteConfig";
import { getSpotifyArtistOverview } from "../../lib/spotifyPublic";
import { jsonResponse } from "../../lib/http";

export const prerender = false;

export const GET: APIRoute = async () => {
  const overview = await getSpotifyArtistOverview();

  if (overview) {
    return jsonResponse(
      {
        monthlyListeners: overview.monthlyListeners,
        followers: overview.followers,
        topTrack: overview.topTrack,
        latestRelease: overview.latestRelease,
        source: "spotify",
        fetchedAt: overview.fetchedAt,
      },
      200,
      {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      }
    );
  }

  return jsonResponse(
    {
      monthlyListeners: null,
      followers: null,
      topTrack: null,
      latestRelease: LATEST_RELEASE,
      source: "config",
      fallback: {
        monthlyListeners: ARTIST_MONTHLY_LISTENERS,
        followers: ARTIST_FOLLOWERS,
        topTrack: ARTIST_TOP_TRACK,
      },
    },
    200,
    { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" }
  );
};
