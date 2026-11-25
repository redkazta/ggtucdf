import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY!
);

export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from('fans_gargut')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch fans' }), { status: 500 });
  }

  return new Response(JSON.stringify({ fans: data }), { status: 200 });
};