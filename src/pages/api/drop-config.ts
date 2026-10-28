import type { APIRoute } from "astro";
import { loadDropSettings } from "../../lib/dropSettings";
import { jsonResponse } from "../../lib/http";

export const prerender = false;

export const GET: APIRoute = async () => {
  const { settings } = await loadDropSettings();

  return jsonResponse(settings, 200, {
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
  });
};
