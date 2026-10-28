-- Tabla para registrar fans en el Drop Room
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS fans_gargut (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL,
  acepto_privacidad BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por email
CREATE INDEX IF NOT EXISTS idx_fans_gargut_email ON fans_gargut(email);

-- Evita duplicados por mayúsculas/minúsculas en instalaciones existentes
CREATE UNIQUE INDEX IF NOT EXISTS idx_fans_gargut_email_lower ON fans_gargut(lower(email));

-- Índice para ordenar por fecha de creación
CREATE INDEX IF NOT EXISTS idx_fans_gargut_created_at ON fans_gargut(created_at DESC);

-- RLS: bloquea el acceso con la anon key.
-- Las API routes usan la service_role key, que omite RLS.
ALTER TABLE fans_gargut ENABLE ROW LEVEL SECURITY;

-- Si la tabla ya existía con email TEXT, conviértela a CITEXT:
-- ALTER TABLE fans_gargut ALTER COLUMN email TYPE CITEXT;
