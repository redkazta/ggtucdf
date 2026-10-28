import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "./env";

let client: SupabaseClient | undefined;

/**
 * Returns a service-role Supabase client, or null when the server is missing
 * configuration. Callers should answer with a 503 instead of crashing.
 *
 * The service-role key bypasses RLS, so this must only be used server-side.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) return client;

  const url = getServerEnv("PUBLIC_SUPABASE_URL", import.meta.env.PUBLIC_SUPABASE_URL);
  const serviceRoleKey = getServerEnv(
    "PRIVATE_SUPABASE_SERVICE_ROLE_KEY",
    import.meta.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY
  );

  if (!url || !serviceRoleKey) return null;

  client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}
