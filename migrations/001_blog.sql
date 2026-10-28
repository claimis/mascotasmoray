-- Blog: artículos e imágenes. Solo crea cosas nuevas; no toca ninguna tabla existente.
CREATE TABLE IF NOT EXISTS blog_post (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  cover_image VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  tags TEXT[] NOT NULL DEFAULT '{}',
  search_text TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS blog_image (
  id SERIAL PRIMARY KEY,
  mime VARCHAR(50) NOT NULL,
  data TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Por si el blog se creó antes de tener etiquetas y buscador.
ALTER TABLE blog_post ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE blog_post ADD COLUMN IF NOT EXISTS search_text TEXT NOT NULL DEFAULT '';
