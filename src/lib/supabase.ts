import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con service_role key (solo para uso server-side en API Routes).
 * Nunca expongas esta key en el cliente.
 */
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY!
);
