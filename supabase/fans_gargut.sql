-- Tabla para registrar fans en el Drop Room
CREATE TABLE IF NOT EXISTS fans_gargut (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL,
  acepto_privacidad BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por email
CREATE INDEX IF NOT EXISTS idx_fans_gargut_email ON fans_gargut(email);

-- Índice para ordenar por fecha de creación
CREATE INDEX IF NOT EXISTS idx_fans_gargut_created_at ON fans_gargut(created_at DESC);

-- Habilitar RLS (Row Level Security) - opcional, para producción
-- ALTER TABLE fans_gargut ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public insert" ON fans_gargut FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public read" ON fans_gargut FOR SELECT USING (true);
