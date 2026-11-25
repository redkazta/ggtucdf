import type { APIRoute } from "astro";
import { isValidSession } from "../../lib/adminAuth";
import { jsonResponse } from "../../lib/http";
import { getSupabaseAdmin } from "../../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  if (!isValidSession(cookies)) {
    return jsonResponse({ error: "No autorizado." }, 401, {
      "Cache-Control": "no-store",
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse(
      { error: "Supabase no está configurado en el servidor." },
      503,
      { "Cache-Control": "no-store" }
    );
  }

  const { data, error } = await supabase
    .from("fans_gargut")
    .select("id, nombre, email, whatsapp, acepto_privacidad, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/fans] Supabase query failed:", error);

    if (error.code === "42P01") {
      return jsonResponse(
        {
          error:
            "Falta la tabla fans_gargut. Ejecuta supabase/fans_gargut.sql en Supabase.",
        },
        500,
        { "Cache-Control": "no-store" }
      );
    }

    return jsonResponse(
      {
        error:
          "No se pudieron cargar los fans. Revisa la service role key y que la tabla fans_gargut exista.",
      },
      500,
      { "Cache-Control": "no-store" }
    );
  }

  return jsonResponse({ fans: data ?? [] }, 200, {
    "Cache-Control": "no-store",
  });
};
