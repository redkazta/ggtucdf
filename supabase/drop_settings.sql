-- Ajustes del último drop y del contador.
-- Se leen desde /api/drop-config y se editan desde /admin o desde el ERP
-- usando /api/drop-settings con un Bearer token.

CREATE TABLE IF NOT EXISTS public.drop_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  latest_release_name TEXT NOT NULL,
  latest_release_url TEXT NOT NULL,
  next_drop_name TEXT,
  next_drop_date TIMESTAMPTZ,
  show_countdown BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS activo sin políticas: solo la service_role key (server-side) puede
-- leer y escribir. El sitio público lee a través de /api/drop-config.
ALTER TABLE public.drop_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_drop_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drop_settings_updated_at ON public.drop_settings;
CREATE TRIGGER drop_settings_updated_at
BEFORE UPDATE ON public.drop_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_drop_settings_updated_at();

-- Fila única con los valores actuales del sitio.
-- El contador queda apagado: /musica muestra "Último drop".
INSERT INTO public.drop_settings (
  id,
  latest_release_name,
  latest_release_url,
  next_drop_name,
  next_drop_date,
  show_countdown
)
VALUES (
  1,
  'Yo te kiero solo',
  'https://open.spotify.com/track/4KvIxXUbDzMicaBr2opF9e',
  'FENTATRIP',
  TIMESTAMPTZ '2026-11-15 00:00:00-06',
  FALSE
)
ON CONFLICT (id) DO NOTHING;
