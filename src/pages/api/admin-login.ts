import type { APIRoute } from "astro";
import {
  isAdminConfigured,
  isValidPassword,
  setSessionCookie,
} from "../../lib/adminAuth";
import { jsonResponse } from "../../lib/http";

export const prerender = false;

function redirect(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
    },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminConfigured()) {
    return redirect("/admin?config=1");
  }

  const contentType = request.headers.get("content-type") ?? "";
  const acceptsJson =
    contentType.includes("application/json") ||
    (request.headers.get("accept") ?? "").includes("application/json");

  let password: unknown;

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { password?: unknown };
      password = body.password;
    } else {
      const form = await request.formData();
      password = form.get("password");
    }
  } catch {
    return acceptsJson
      ? jsonResponse({ error: "Solicitud inválida." }, 400)
      : redirect("/admin?error=1");
  }

  if (!isValidPassword(password)) {
    // Slow down trivial brute-force attempts.
    await new Promise((resolve) => setTimeout(resolve, 350));

    return acceptsJson
      ? jsonResponse({ error: "Contraseña incorrecta." }, 401)
      : redirect("/admin?error=1");
  }

  if (!setSessionCookie(cookies)) {
    return acceptsJson
      ? jsonResponse({ error: "El panel no está configurado." }, 503)
      : redirect("/admin?config=1");
  }

  return acceptsJson ? jsonResponse({ success: true }) : redirect("/admin");
};

export const GET: APIRoute = () => redirect("/admin");
