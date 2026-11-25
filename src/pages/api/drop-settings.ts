import type { AstroCookies } from "astro";
import type { APIRoute } from "astro";
import { isValidBearerToken, isValidSession } from "../../lib/adminAuth";
import { loadDropSettings, normalizeNextDropDate } from "../../lib/dropSettings";
import { jsonResponse } from "../../lib/http";
import { getSupabaseAdmin } from "../../lib/supabase";

export const prerender = false;

const NAME_MAX_LENGTH = 120;
const URL_MAX_LENGTH = 500;

function isAuthorized(cookies: AstroCookies, request: Request): boolean {
  return isValidSession(cookies) || isValidBearerToken(request);
}

function cleanName(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;

  const name = value.trim().replace(/\s+/g, " ");
  return name.length > 0 && name.length <= maxLength ? name : null;
}

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw || raw.length > URL_MAX_LENGTH) return null;

  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function readBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1;
}

function unauthorized(): Response {
  return jsonResponse({ error: "No autorizado." }, 401, {
    "Cache-Control": "no-store",
  });
}

export const GET: APIRoute = async ({ cookies, request }) => {
  if (!isAuthorized(cookies, request)) return unauthorized();

  const result = await loadDropSettings();

  if (!result.configured) {
    return jsonResponse(
      { error: "Supabase no está configurado en el servidor." },
      503,
      { "Cache-Control": "no-store" }
    );
  }

  return jsonResponse(result.settings, 200, {
    "Cache-Control": "no-store",
  });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  if (!isAuthorized(cookies, request)) return unauthorized();

  let body: Record<string, unknown>;

  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ error: "Solicitud inválida." }, 400, {
        "Cache-Control": "no-store",
      });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Solicitud inválida." }, 400, {
      "Cache-Control": "no-store",
    });
  }

  const latestReleaseName = cleanName(body.latestReleaseName, NAME_MAX_LENGTH);
  const latestReleaseUrl = cleanUrl(body.latestReleaseUrl);

  if (!latestReleaseName) {
    return jsonResponse(
      { error: `El nombre del último drop debe tener 1-${NAME_MAX_LENGTH} caracteres.` },
      400,
      { "Cache-Control": "no-store" }
    );
  }

  if (!latestReleaseUrl) {
    return jsonResponse(
      { error: "La URL del último drop debe ser una URL http(s) válida." },
      400,
      { "Cache-Control": "no-store" }
    );
  }

  const rawNextDropName =
    typeof body.nextDropName === "string" ? body.nextDropName.trim() : "";
  const nextDropName = rawNextDropName
    ? cleanName(rawNextDropName, NAME_MAX_LENGTH)
    : null;

  if (rawNextDropName && !nextDropName) {
    return jsonResponse(
      { error: `El nombre del próximo drop debe tener 1-${NAME_MAX_LENGTH} caracteres.` },
      400,
      { "Cache-Control": "no-store" }
    );
  }

  const nextDropDate = normalizeNextDropDate(body.nextDropDate);
  if (nextDropDate === undefined) {
    return jsonResponse(
      { error: "La fecha del próximo drop no es válida." },
      400,
      { "Cache-Control": "no-store" }
    );
  }

  const showCountdown = readBoolean(body.showCountdown);

  if (showCountdown && (!nextDropName || !nextDropDate)) {
    return jsonResponse(
      { error: "Para activar el contador indica el nombre y la fecha del próximo drop." },
      400,
      { "Cache-Control": "no-store" }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse(
      { error: "Supabase no está configurado en el servidor." },
      503,
      { "Cache-Control": "no-store" }
    );
  }

  const { error } = await supabase.from("drop_settings").upsert(
    {
      id: 1,
      latest_release_name: latestReleaseName,
      latest_release_url: latestReleaseUrl,
      next_drop_name: nextDropName,
      next_drop_date: nextDropDate,
      show_countdown: showCountdown,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[api/drop-settings] Supabase upsert failed:", error);

    if (error.code === "42P01") {
      return jsonResponse(
        {
          error:
            "Falta la tabla drop_settings. Ejecuta supabase/drop_settings.sql en Supabase.",
        },
        500,
        { "Cache-Control": "no-store" }
      );
    }

    return jsonResponse(
      { error: "No se pudieron guardar los ajustes." },
      500,
      { "Cache-Control": "no-store" }
    );
  }

  return jsonResponse(
    {
      success: true,
      settings: {
        latestReleaseName,
        latestReleaseUrl,
        nextDropName: nextDropName ?? "",
        nextDropDate,
        showCountdown,
        updatedAt: new Date().toISOString(),
      },
    },
    200,
    { "Cache-Control": "no-store" }
  );
};
