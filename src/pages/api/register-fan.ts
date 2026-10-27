import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(import.meta.env.PRIVATE_RESEND_API_KEY!);

export const POST: APIRoute = async ({ request }) => {
  const { nombre, email, whatsapp, acepto_privacidad } = await request.json();

  const { error } = await supabase
    .from('fans_gargut')
    .insert({ nombre, email, whatsapp, acepto_privacidad });

  if (error) {
    console.error('Supabase insert error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save fan' }), { status: 500 });
  }

  try {
    await resend.emails.send({
      from: import.meta.env.PRIVATE_RESEND_FROM_EMAIL!,
      to: email,
      subject: '¡Bienvenido al hub de Gargut!',
      html: `
        <h1>¡Hola ${nombre}!</h1>
        <p>Gracias por registrarte. Aquí tienes el enlace a nuestro canal de difusión de WhatsApp:</p>
        <a href="https://chat.whatsapp.com/XXXXX" target="_blank">https://chat.whatsapp.com/XXXXX</a>
        <p>¡Nos vemos pronto!</p>
      `,
    });
  } catch (e) {
    console.error('Resend error:', e);
    // No bloqueamos la inserción, solo avisamos
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};