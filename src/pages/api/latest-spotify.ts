import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: import.meta.env.SPOTIFY_CLIENT_ID!,
        client_secret: import.meta.env.SPOTIFY_CLIENT_SECRET!,
      }),
    });

    if (!tokenRes.ok) throw new Error('Spotify token error');
    const { access_token } = await tokenRes.json();

    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/artists/${import.meta.env.SPOTIFY_ARTIST_ID}/albums?include_groups=album,single&limit=1&sort=release_date_desc`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    if (!spotifyRes.ok) throw new Error('Spotify API error');
    const { items } = await spotifyRes.json();

    const latest = items?.[0];
    const trackId = latest?.tracks?.[0]?.id ?? latest?.id ?? null;

    if (!trackId) throw new Error('No track found');

    return new Response(JSON.stringify({ id: trackId }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to fetch latest Spotify track' }), { status: 500 });
  }
};