import type { APIRoute } from "astro";
import { Resend } from "resend";
import { SITE_URL } from "../../data/siteConfig";
import { getServerEnv } from "../../lib/env";
import { jsonResponse } from "../../lib/http";
import { getSupabaseAdmin } from "../../lib/supabase";

export const prerender = false;

const NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 254;
const WHATSAPP_MAX_LENGTH = 20;

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= NAME_MAX_LENGTH ? name : null;
}

function cleanEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > EMAIL_MAX_LENGTH) return null;

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

function cleanWhatsapp(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const whatsapp = value.trim().replace(/[\s().-]+/g, "");
  if (whatsapp.length > WHATSAPP_MAX_LENGTH) return null;

  return /^\+?\d{7,15}$/.test(whatsapp) ? whatsapp : null;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character
  );
}

async function sendWelcomeEmail(name: string, email: string): Promise<void> {
  const apiKey = getServerEnv("PRIVATE_RESEND_API_KEY", import.meta.env.PRIVATE_RESEND_API_KEY);
  const from = getServerEnv(
    "PRIVATE_RESEND_FROM_EMAIL",
    import.meta.env.PRIVATE_RESEND_FROM_EMAIL
  );

  if (!apiKey || !from) {
    console.warn("[api/register-fan] Resend no está configurado; se omitió el email.");
    return;
  }

  const musicUrl = new URL("/musica/", SITE_URL).href;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: "¡Bienvenido al Drop Room de Gargut!",
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #111; line-height: 1.5;">
          <h1 style="margin: 0 0 16px;">¡Hola ${escapeHtml(name)}!</h1>
          <p>Ya estás dentro del Drop Room de Gargut.</p>
          <p>Te avisaremos del próximo drop y del contenido exclusivo.</p>
          <p>
            <a href="${musicUrl}" style="color: #b91c1c;">Escucha la música en Spotify</a>
          </p>
          <p style="margin-top: 24px;">— Gargut</p>
        </div>
      `,
    });

    if (error) {
      console.error("[api/register-fan] Resend error:", error);
    }
  } catch (error) {
    // A failed welcome email must not discard a valid registration.
    console.error("[api/register-fan] Resend exception:", error);
  }
}

export const POST: APIRoute = async ({ request }) => {
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

  const nombre = cleanName(body.nombre);
  const email = cleanEmail(body.email);
  const whatsapp = cleanWhatsapp(body.whatsapp);

  if (!nombre) {
    return jsonResponse(
      { error: `Introduce un nombre válido (2-${NAME_MAX_LENGTH} caracteres).` },
      400,
      { "Cache-Control": "no-store" }
    );
  }

  if (!email) {
    return jsonResponse({ error: "Introduce un email válido." }, 400, {
      "Cache-Control": "no-store",
    });
  }

  if (!whatsapp) {
    return jsonResponse(
      { error: "Introduce un número de WhatsApp válido (ej. +521234567890)." },
      400,
      { "Cache-Control": "no-store" }
    );
  }

  if (body.acepto_privacidad !== true) {
    return jsonResponse(
      { error: "Debes aceptar el aviso de privacidad para registrarte." },
      400,
      { "Cache-Control": "no-store" }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse(
      { error: "El registro no está disponible en este momento." },
      503,
      { "Cache-Control": "no-store" }
    );
  }

  const { error } = await supabase.from("fans_gargut").insert({
    nombre,
    email,
    whatsapp,
    acepto_privacidad: true,
  });

  if (error) {
    if (error.code === "23505") {
      return jsonResponse({ error: "Este email ya está registrado." }, 409, {
        "Cache-Control": "no-store",
      });
    }

    console.error("[api/register-fan] Supabase insert failed:", error);
    return jsonResponse(
      { error: "No se pudo completar el registro. Inténtalo de nuevo." },
      500,
      { "Cache-Control": "no-store" }
    );
  }

  await sendWelcomeEmail(nombre, email);

  return jsonResponse({ success: true }, 201, {
    "Cache-Control": "no-store",
  });
};
