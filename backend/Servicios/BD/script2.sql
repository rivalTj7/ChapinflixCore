-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create refresh tokens table (for JWT refresh)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

select * from users;


































-- =========================================================
-- Chapinflix - Esquema de Contenido (Películas)
-- PostgreSQL 14+
-- Mantiene simple: películas, categorías, favoritos, ver luego, historial.
-- =========================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Esquema dedicado
CREATE SCHEMA IF NOT EXISTS content;
SET search_path TO content, public;

-- -----------------------------
-- Tablas de soporte simples
-- -----------------------------

-- Clasificaciones (ej. G, PG, PG-13, R, NR)
CREATE TABLE IF NOT EXISTS classification (
  id          SMALLSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,     -- ej: 'G','PG','PG-13','R','NR'
  name        TEXT NOT NULL,            -- nombre legible
  description TEXT
);

-- Estudios / productoras
CREATE TABLE IF NOT EXISTS studio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  country     TEXT,
  website     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorías con soporte de subcategorías simple
CREATE TABLE IF NOT EXISTS category (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  parent_id   UUID NULL REFERENCES category(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_parent ON category(parent_id);

-- -----------------------------
-- Películas
-- -----------------------------

CREATE TABLE IF NOT EXISTS movie (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  synopsis_short    TEXT,                         -- para cards/carruseles
  synopsis_long     TEXT,                         -- detalle
  duration_minutes  INTEGER CHECK (duration_minutes > 0),
  release_date      DATE,
  classification_id SMALLINT REFERENCES classification(id) ON DELETE SET NULL,
  studio_id         UUID REFERENCES studio(id) ON DELETE SET NULL,

  language          TEXT,                         -- idioma principal
  country           TEXT,

  poster_url        TEXT,                         -- portada
  banner_url        TEXT,                         -- hero/banner
  trailer_url       TEXT,                         -- trailer (opcional)

  is_free           BOOLEAN NOT NULL DEFAULT FALSE,        -- accesible a usuarios gratuitos
  available_from    TIMESTAMPTZ,                           -- disponibilidad (opcional)
  available_until   TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,         -- soft toggle de catálogo

  upload_date       TIMESTAMPTZ NOT NULL DEFAULT now(),    -- para "recientemente agregados"
  view_count        BIGINT NOT NULL DEFAULT 0,             -- contador de vistas

  created_by        UUID,     -- opcional: habilitador de contenido (no FK forzada)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movie_active ON movie(is_active);
CREATE INDEX IF NOT EXISTS idx_movie_upload_date ON movie(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_movie_view_count ON movie(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_movie_availability ON movie(available_from, available_until);

-- Mantener updated_at
CREATE OR REPLACE FUNCTION trg_movie_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS set_movie_updated_at ON movie;
CREATE TRIGGER set_movie_updated_at
BEFORE UPDATE ON movie
FOR EACH ROW EXECUTE FUNCTION trg_movie_set_updated_at();

-- Relación N:M Película <-> Categoría
CREATE TABLE IF NOT EXISTS movie_category (
  movie_id    UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES category(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, category_id)
);

-- Galería de imágenes por película (stills, posters alternos, etc.)
CREATE TABLE IF NOT EXISTS movie_image (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id    UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  label       TEXT,         -- ej: 'still', 'backstage', 'key-art'
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movie_image_movie ON movie_image(movie_id, sort_order);

-- -----------------------------
-- Interacciones del usuario
-- (user_id sin FK forzada para no depender del módulo de auth)
-- -----------------------------

-- Favoritos
CREATE TABLE IF NOT EXISTS favorite (
  user_id    UUID NOT NULL,
  movie_id   UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_user ON favorite(user_id);

-- Ver luego (watchlist)
CREATE TABLE IF NOT EXISTS watchlist (
  user_id    UUID NOT NULL,
  movie_id   UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

-- Historial de visualización (evento simple)
CREATE TABLE IF NOT EXISTS view_history (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  movie_id   UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_view_history_user ON view_history(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_history_movie ON view_history(movie_id, viewed_at DESC);

-- Trigger: incrementar view_count al registrar una visualización
CREATE OR REPLACE FUNCTION trg_increment_movie_view_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE movie
     SET view_count = view_count + 1,
         updated_at = now()
   WHERE id = NEW.movie_id;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS after_insert_view_history ON view_history;
CREATE TRIGGER after_insert_view_history
AFTER INSERT ON view_history
FOR EACH ROW EXECUTE FUNCTION trg_increment_movie_view_count();

-- ------------------------------------------
-- Datos seed opcionales (clasificaciones base)
-- ------------------------------------------
INSERT INTO classification (code, name, description) VALUES
  ('G', 'General', 'Apta para todo público'),
  ('PG', 'Parental Guidance', 'Sugiere guía parental'),
  ('PG-13', 'Parents Strongly Cautioned', 'No apta para menores de 13 sin guía'),
  ('R', 'Restricted', 'Restringida, menores con adulto'),
  ('NR', 'Not Rated', 'No clasificada')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------
-- NOTAS para integrar con tu módulo de auth
-- Si quieres forzar FK a tu tabla de usuarios, descomenta y ajusta:
-- ALTER TABLE content.favorite
--   ADD CONSTRAINT fk_favorite_user
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
--
-- ALTER TABLE content.watchlist
--   ADD CONSTRAINT fk_watchlist_user
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
--
-- ALTER TABLE content.view_history
--   ADD CONSTRAINT fk_viewhistory_user
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
--
-- ALTER TABLE content.movie
--   ADD CONSTRAINT fk_movie_created_by
--   FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;




-- =========================================================
-- Chapinflix - Gestión de Catálogo (Funciones)
-- Esquema: content
-- PostgreSQL 14+
-- =========================================================

SET search_path TO content, public;

-- ------------------------------------------------------------------
-- Ajustes menores (por si aún no están):
-- ------------------------------------------------------------------
-- Añadir is_active a category para borrado lógico (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'content' AND table_name = 'category' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE category ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    CREATE INDEX IF NOT EXISTS idx_category_active ON category(is_active);
  END IF;
END$$;

-- Añadir is_active a movie (ya está en el script previo, solo seguridad)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'content' AND table_name = 'movie' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE movie ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    CREATE INDEX IF NOT EXISTS idx_movie_active ON movie(is_active);
  END IF;
END$$;

-- ------------------------------------------------------------------
-- Soportes simples: UPSERT de studio y classification
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_upsert_studio(
  p_name TEXT,
  p_country TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_id FROM studio WHERE name = p_name;
  IF v_id IS NULL THEN
    INSERT INTO studio(name, country, website)
    VALUES (p_name, p_country, p_website)
    RETURNING id INTO v_id;
  ELSE
    UPDATE studio
       SET country = COALESCE(p_country, country),
           website = COALESCE(p_website, website)
     WHERE id = v_id;
  END IF;
  RETURN v_id;
END$$;

CREATE OR REPLACE FUNCTION fn_upsert_classification(
  p_code TEXT,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS SMALLINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id SMALLINT;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_id FROM classification WHERE code = p_code;
  IF v_id IS NULL THEN
    INSERT INTO classification(code, name, description)
    VALUES (p_code, COALESCE(p_name, p_code), p_description)
    RETURNING id INTO v_id;
  ELSE
    UPDATE classification
       SET name = COALESCE(p_name, name),
           description = COALESCE(p_description, description)
     WHERE id = v_id;
  END IF;
  RETURN v_id;
END$$;

-- ------------------------------------------------------------------
-- Categorías: crear / actualizar / borrado lógico
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_category_create(
  p_name TEXT,
  p_slug TEXT,
  p_parent_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'category name required';
  END IF;
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RAISE EXCEPTION 'category slug required';
  END IF;

  -- Validar que el parent exista (si se provee)
  IF p_parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM category WHERE id = p_parent_id
  ) THEN
    RAISE EXCEPTION 'parent_id % does not exist', p_parent_id;
  END IF;

  INSERT INTO category(name, slug, parent_id, is_active)
  VALUES (p_name, lower(p_slug), p_parent_id, TRUE)
  ON CONFLICT (slug) DO UPDATE
     SET name = EXCLUDED.name,
         parent_id = EXCLUDED.parent_id,
         is_active = TRUE
  RETURNING id INTO v_id;

  RETURN v_id;
END$$;

CREATE OR REPLACE FUNCTION fn_category_update(
  p_id UUID,
  p_name TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar parent si viene
  IF p_parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM category WHERE id = p_parent_id
  ) THEN
    RAISE EXCEPTION 'parent_id % does not exist', p_parent_id;
  END IF;

  UPDATE category
     SET name = COALESCE(p_name, name),
         slug = COALESCE(LOWER(p_slug), slug),
         parent_id = COALESCE(p_parent_id, parent_id),
         is_active = COALESCE(p_is_active, is_active)
   WHERE id = p_id;
END$$;

CREATE OR REPLACE FUNCTION fn_category_soft_delete(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_inuse INT;
BEGIN
  -- Si la categoría está asignada a películas, solo desactivar (mantenemos soft delete siempre)
  SELECT COUNT(*) INTO v_inuse FROM movie_category WHERE category_id = p_id;
  IF v_inuse >= 0 THEN
    UPDATE category SET is_active = FALSE WHERE id = p_id;
  END IF;
END$$;

-- ------------------------------------------------------------------
-- Películas: crear / patch / activar / disponibilidad / is_free
-- ------------------------------------------------------------------

-- Crear película individual + opción de categorías por slug
CREATE OR REPLACE FUNCTION fn_movie_create(
  p_title TEXT,
  p_slug TEXT,
  p_synopsis_short TEXT DEFAULT NULL,
  p_synopsis_long  TEXT DEFAULT NULL,
  p_duration_minutes INT DEFAULT NULL,
  p_release_date DATE DEFAULT NULL,
  p_classification_code TEXT DEFAULT NULL,
  p_studio_name TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_poster_url TEXT DEFAULT NULL,
  p_banner_url TEXT DEFAULT NULL,
  p_trailer_url TEXT DEFAULT NULL,
  p_is_free BOOLEAN DEFAULT FALSE,
  p_available_from TIMESTAMPTZ DEFAULT NULL,
  p_available_until TIMESTAMPTZ DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_category_slugs TEXT[] DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_class_id SMALLINT;
  v_studio_id UUID;
  v_slug TEXT := lower(p_slug);
  v_cat_id UUID;
  v_slug_cat TEXT;
BEGIN
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'title required';
  END IF;
  IF v_slug IS NULL OR trim(v_slug) = '' THEN
    RAISE EXCEPTION 'slug required';
  END IF;

  v_class_id := fn_upsert_classification(p_classification_code, NULL, NULL);
  v_studio_id := fn_upsert_studio(p_studio_name, NULL, NULL);

  INSERT INTO movie(
    title, slug, synopsis_short, synopsis_long, duration_minutes, release_date,
    classification_id, studio_id, language, country,
    poster_url, banner_url, trailer_url,
    is_free, available_from, available_until, is_active,
    upload_date, created_by
  ) VALUES (
    p_title, v_slug, p_synopsis_short, p_synopsis_long, p_duration_minutes, p_release_date,
    v_class_id, v_studio_id, p_language, p_country,
    p_poster_url, p_banner_url, p_trailer_url,
    COALESCE(p_is_free, FALSE), p_available_from, p_available_until, TRUE,
    now(), p_created_by
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- Si ya existe, regresamos su id (no lo sobreescribimos en create)
    SELECT id INTO v_id FROM movie WHERE slug = v_slug;
  END IF;

  -- Categorías
  IF p_category_slugs IS NOT NULL THEN
    FOREACH v_slug_cat IN ARRAY p_category_slugs LOOP
      v_slug_cat := lower(v_slug_cat);
      -- upsert sencillo de categoría si no existe
      INSERT INTO category(name, slug, is_active) VALUES (initcap(v_slug_cat), v_slug_cat, TRUE)
      ON CONFLICT (slug) DO UPDATE SET is_active = TRUE
      RETURNING id INTO v_cat_id;

      INSERT INTO movie_category(movie_id, category_id)
      VALUES (v_id, v_cat_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_id;
END$$;

-- Patch parcial por JSONB (solo campos presentes)
-- keys soportadas (snake_case): title, synopsis_short, synopsis_long, duration_minutes,
-- release_date, classification_code, studio_name, language, country,
-- poster_url, banner_url, trailer_url, is_free, available_from, available_until, is_active
CREATE OR REPLACE FUNCTION fn_movie_patch(
  p_movie_id UUID,
  p_patch JSONB
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_class_id SMALLINT;
  v_studio_id UUID;
BEGIN
  IF p_patch ? 'classification_code' THEN
    v_class_id := fn_upsert_classification(p_patch->>'classification_code', NULL, NULL);
  END IF;

  IF p_patch ? 'studio_name' THEN
    v_studio_id := fn_upsert_studio(p_patch->>'studio_name', NULL, NULL);
  END IF;

  UPDATE movie SET
    title            = COALESCE(p_patch->>'title', title),
    synopsis_short   = COALESCE(p_patch->>'synopsis_short', synopsis_short),
    synopsis_long    = COALESCE(p_patch->>'synopsis_long', synopsis_long),
    duration_minutes = COALESCE((p_patch->>'duration_minutes')::INT, duration_minutes),
    release_date     = COALESCE((p_patch->>'release_date')::DATE, release_date),
    classification_id= COALESCE(v_class_id, classification_id),
    studio_id        = COALESCE(v_studio_id, studio_id),
    language         = COALESCE(p_patch->>'language', language),
    country          = COALESCE(p_patch->>'country', country),
    poster_url       = COALESCE(p_patch->>'poster_url', poster_url),
    banner_url       = COALESCE(p_patch->>'banner_url', banner_url),
    trailer_url      = COALESCE(p_patch->>'trailer_url', trailer_url),
    is_free          = COALESCE((p_patch->>'is_free')::BOOLEAN, is_free),
    available_from   = COALESCE((p_patch->>'available_from')::TIMESTAMPTZ, available_from),
    available_until  = COALESCE((p_patch->>'available_until')::TIMESTAMPTZ, available_until),
    is_active        = COALESCE((p_patch->>'is_active')::BOOLEAN, is_active),
    updated_at       = now()
  WHERE id = p_movie_id;
END$$;

-- Activar / Desactivar (borrado lógico)
CREATE OR REPLACE FUNCTION fn_movie_set_active(
  p_movie_id UUID,
  p_is_active BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE movie SET is_active = p_is_active, updated_at = now()
  WHERE id = p_movie_id;
END$$;

-- Disponibilidad
CREATE OR REPLACE FUNCTION fn_movie_set_availability(
  p_movie_id UUID,
  p_from TIMESTAMPTZ,
  p_until TIMESTAMPTZ
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE movie
     SET available_from = p_from,
         available_until = p_until,
         updated_at = now()
   WHERE id = p_movie_id;
END$$;

-- Marcar como gratuito/pagado
CREATE OR REPLACE FUNCTION fn_movie_set_is_free(
  p_movie_id UUID,
  p_is_free BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE movie SET is_free = p_is_free, updated_at = now()
  WHERE id = p_movie_id;
END$$;

-- ------------------------------------------------------------------
-- Categorías <-> Películas
-- ------------------------------------------------------------------

-- Reemplazar categorías por slugs (idempotente)
CREATE OR REPLACE FUNCTION fn_movie_set_categories(
  p_movie_id UUID,
  p_category_slugs TEXT[]
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT;
  v_cat_id UUID;
BEGIN
  DELETE FROM movie_category WHERE movie_id = p_movie_id;

  IF p_category_slugs IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_slug IN ARRAY p_category_slugs LOOP
    v_slug := lower(v_slug);
    INSERT INTO category(name, slug, is_active)
    VALUES (initcap(v_slug), v_slug, TRUE)
    ON CONFLICT (slug) DO UPDATE SET is_active = TRUE
    RETURNING id INTO v_cat_id;

    INSERT INTO movie_category(movie_id, category_id)
    VALUES (p_movie_id, v_cat_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END$$;

-- Agregar 1 categoría por slug
CREATE OR REPLACE FUNCTION fn_movie_add_category(
  p_movie_id UUID,
  p_category_slug TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat_id UUID;
  v_slug TEXT := lower(p_category_slug);
BEGIN
  INSERT INTO category(name, slug, is_active)
  VALUES (initcap(v_slug), v_slug, TRUE)
  ON CONFLICT (slug) DO UPDATE SET is_active = TRUE
  RETURNING id INTO v_cat_id;

  INSERT INTO movie_category(movie_id, category_id)
  VALUES (p_movie_id, v_cat_id)
  ON CONFLICT DO NOTHING;
END$$;

-- Quitar 1 categoría por slug
CREATE OR REPLACE FUNCTION fn_movie_remove_category(
  p_movie_id UUID,
  p_category_slug TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat_id UUID;
BEGIN
  SELECT id INTO v_cat_id FROM category WHERE slug = lower(p_category_slug);
  IF v_cat_id IS NULL THEN
    RETURN;
  END IF;
  DELETE FROM movie_category WHERE movie_id = p_movie_id AND category_id = v_cat_id;
END$$;

-- ------------------------------------------------------------------
-- Imágenes de película
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_movie_image_add(
  p_movie_id UUID,
  p_url TEXT,
  p_label TEXT DEFAULT NULL,
  p_sort_order INT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_next INT;
BEGIN
  IF p_sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), -1) + 1
      INTO v_next
      FROM movie_image
     WHERE movie_id = p_movie_id;
  ELSE
    v_next := p_sort_order;
  END IF;

  INSERT INTO movie_image(movie_id, url, label, sort_order)
  VALUES (p_movie_id, p_url, p_label, v_next)
  RETURNING id INTO v_id;

  RETURN v_id;
END$$;

CREATE OR REPLACE FUNCTION fn_movie_image_delete(
  p_image_id UUID
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM movie_image WHERE id = p_image_id;
END$$;

-- Reordenar por arreglo de image_id (el índice del array define el orden)
CREATE OR REPLACE FUNCTION fn_movie_images_reorder(
  p_movie_id UUID,
  p_image_ids UUID[]
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  i INT := 1;
  v_image_id UUID;
BEGIN
  IF p_image_ids IS NULL OR array_length(p_image_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_image_id IN ARRAY p_image_ids LOOP
    UPDATE movie_image
       SET sort_order = i
     WHERE id = v_image_id
       AND movie_id = p_movie_id;
    i := i + 1;
  END LOOP;
END$$;

-- ------------------------------------------------------------------
-- Carga masiva (JSONB) con upsert por slug
-- ------------------------------------------------------------------
-- Estructura esperada por item:
-- {
--   "title": "Pelicula X", "slug": "pelicula-x",
--   "synopsis_short":"...", "synopsis_long":"...",
--   "duration_minutes": 120, "release_date": "2024-01-15",
--   "classification_code": "PG-13",
--   "studio_name": "Estudio Chapín",
--   "language": "es", "country": "GT",
--   "poster_url":"...", "banner_url":"...", "trailer_url":"...",
--   "is_free": false,
--   "available_from": "2025-01-01T00:00:00Z",
--   "available_until": null,
--   "categories": ["accion","drama","chapina"]
-- }
--
-- Si el slug existe: hace PATCH de campos presentes y refresca categorías si se proveen.
-- Si no existe: crea película y asigna categorías.
CREATE OR REPLACE FUNCTION fn_bulk_upsert_movies(
  p_payload JSONB,
  p_created_by UUID DEFAULT NULL
) RETURNS TABLE(inserted INT, updated INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_item JSONB;
  v_slug TEXT;
  v_existing UUID;
  v_ins INT := 0;
  v_upd INT := 0;
  v_cats TEXT[];
BEGIN
  IF jsonb_typeof(p_payload) <> 'array' THEN
    RAISE EXCEPTION 'Payload must be a JSON array';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload) LOOP
    v_slug := lower(v_item->>'slug');
    IF v_slug IS NULL OR trim(v_slug) = '' THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_existing FROM movie WHERE slug = v_slug;

    IF v_existing IS NULL THEN
      PERFORM fn_movie_create(
        v_item->>'title',
        v_slug,
        v_item->>'synopsis_short',
        v_item->>'synopsis_long',
        NULLIF(v_item->>'duration_minutes','')::INT,
        NULLIF(v_item->>'release_date','')::DATE,
        v_item->>'classification_code',
        v_item->>'studio_name',
        v_item->>'language',
        v_item->>'country',
        v_item->>'poster_url',
        v_item->>'banner_url',
        v_item->>'trailer_url',
        COALESCE((v_item->>'is_free')::BOOLEAN, FALSE),
        NULLIF(v_item->>'available_from','')::TIMESTAMPTZ,
        NULLIF(v_item->>'available_until','')::TIMESTAMPTZ,
        p_created_by,
        (
          SELECT ARRAY_AGG(LOWER(elem))
          FROM jsonb_array_elements_text(v_item->'categories') AS elem
        )
      );
      v_ins := v_ins + 1;
    ELSE
      PERFORM fn_movie_patch(v_existing, v_item);
      -- Si incluye categories, reemplazarlas
      IF v_item ? 'categories' THEN
        SELECT ARRAY_AGG(LOWER(elem))
          INTO v_cats
        FROM jsonb_array_elements_text(v_item->'categories') AS elem;
        PERFORM fn_movie_set_categories(v_existing, v_cats);
      END IF;
      v_upd := v_upd + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_ins, v_upd;
END$$;

















--ROLLBACK ;

SET search_path TO content, public;

-- 0) Limpieza mínima opcional (NO borra películas existentes)
DO $$
DECLARE mv UUID;
BEGIN
  SELECT id INTO mv FROM movie WHERE slug = 'el-viaje-chapin';
  IF mv IS NOT NULL THEN
    DELETE FROM movie_image WHERE movie_id = mv;
    DELETE FROM movie_category WHERE movie_id = mv;
  END IF;
END$$;

-- 1) Crear/asegurar categorías base (idempotentes)
SELECT fn_category_create('Acción',   'accion',   NULL)  AS cat_accion;
SELECT fn_category_create('Drama',    'drama',    NULL)  AS cat_drama;
SELECT fn_category_create('Chapina',  'chapina',  NULL)  AS cat_chapina;
SELECT fn_category_create('Aventura', 'aventura', NULL)  AS cat_aventura;

-- 2) Crear película individual con categorías (upsert simple de studio/classification)
SELECT fn_movie_create(
  p_title            := 'El Viaje Chapín',
  p_slug             := 'el-viaje-chapin',
  p_synopsis_short   := 'Un road trip por Guatemala.',
  p_synopsis_long    := 'Tres amigos recorren el país descubriendo historias.',
  p_duration_minutes := 104,
  p_release_date     := '2024-08-01',
  p_classification_code := 'PG',
  p_studio_name      := 'Estudio Chapín',
  p_language         := 'es',
  p_country          := 'GT',
  p_poster_url       := 'https://cdn/chapin/posters/viaje.jpg',
  p_banner_url       := 'https://cdn/chapin/banners/viaje.jpg',
  p_trailer_url      := 'https://youtu.be/xxxxx',
  p_is_free          := FALSE,
  p_available_from   := '2025-01-01T00:00:00Z',
  p_available_until  := NULL,
  p_created_by       := NULL,
  p_category_slugs   := ARRAY['aventura','drama','chapina']
) AS movie_created_id;

-- 3) Verificar película y categorías
SELECT id, title, slug, is_free, view_count, available_from, available_until, is_active
FROM movie WHERE slug='el-viaje-chapin';

SELECT c.slug AS category_slug
FROM category c
JOIN movie_category mc ON mc.category_id = c.id
JOIN movie m ON m.id = mc.movie_id
WHERE m.slug = 'el-viaje-chapin'
ORDER BY c.slug;

-- 4) Patch parcial de película (duration, language, is_free, banner_url)
SELECT fn_movie_patch(
  (SELECT id FROM movie WHERE slug='el-viaje-chapin'),
  '{"duration_minutes":110,"language":"es-419","is_free":true,"banner_url":"https://cdn/chapin/banners/viaje_v2.jpg"}'::jsonb
);

-- 5) Verificar patch
SELECT title, duration_minutes, language, is_free, banner_url
FROM movie WHERE slug='el-viaje-chapin';

-- 6) Definir disponibilidad
SELECT fn_movie_set_availability(
  (SELECT id FROM movie WHERE slug='el-viaje-chapin'),
  '2025-01-01T00:00:00Z',
  '2025-12-31T23:59:59Z'
);

-- 7) Agregar y quitar categorías
SELECT fn_movie_add_category((SELECT id FROM movie WHERE slug='el-viaje-chapin'), 'suspenso');
SELECT fn_movie_remove_category((SELECT id FROM movie WHERE slug='el-viaje-chapin'), 'drama');

SELECT c.slug
FROM category c
JOIN movie_category mc ON mc.category_id = c.id
JOIN movie m ON m.id = mc.movie_id
WHERE m.slug='el-viaje-chapin'
ORDER BY c.slug;

-- 8) Imágenes: agregar 3, reordenar [3,1,2], eliminar la #2
DO $$
DECLARE
  mv UUID;
  img1 UUID; img2 UUID; img3 UUID;
BEGIN
  SELECT id INTO mv FROM movie WHERE slug='el-viaje-chapin';

  img1 := fn_movie_image_add(mv, 'https://cdn/chapin/imgs/viaje_1.jpg', 'still', NULL);
  img2 := fn_movie_image_add(mv, 'https://cdn/chapin/imgs/viaje_2.jpg', 'still', NULL);
  img3 := fn_movie_image_add(mv, 'https://cdn/chapin/imgs/viaje_3.jpg', 'still', NULL);

  PERFORM fn_movie_images_reorder(mv, ARRAY[img3, img1, img2]); -- nuevo orden: 3,1,2
  PERFORM fn_movie_image_delete(img2); -- elimina la segunda
END$$;

SELECT url, label, sort_order
FROM movie_image
WHERE movie_id = (SELECT id FROM movie WHERE slug='el-viaje-chapin')
ORDER BY sort_order;

-- 9) Trigger de vistas: insertar 2 vistas y verificar view_count +2
INSERT INTO view_history(user_id, movie_id)
VALUES (gen_random_uuid(), (SELECT id FROM movie WHERE slug='el-viaje-chapin'));

INSERT INTO view_history(user_id, movie_id)
VALUES (gen_random_uuid(), (SELECT id FROM movie WHERE slug='el-viaje-chapin'));

SELECT title, view_count
FROM movie
WHERE slug='el-viaje-chapin';

-- 10) Carga masiva (una actualización + una creación)
SELECT * FROM fn_bulk_upsert_movies($$[
  {
    "title": "El Viaje Chapín",
    "slug": "el-viaje-chapin",
    "is_free": false,
    "categories": ["aventura","chapina","comedia"]
  },
  {
    "title": "Leyendas del Lago",
    "slug": "leyendas-del-lago",
    "duration_minutes": 92,
    "classification_code": "PG-13",
    "studio_name": "Films GT",
    "categories": ["fantasia","suspenso"]
  }
]$$::jsonb, NULL);

-- 11) Verificar la nueva película + categorías
SELECT id, title, slug, duration_minutes, is_free, is_active
FROM movie WHERE slug IN ('el-viaje-chapin','leyendas-del-lago')
ORDER BY slug;

SELECT m.slug, array_agg(c.slug ORDER BY c.slug) AS categories
FROM movie m
LEFT JOIN movie_category mc ON mc.movie_id = m.id
LEFT JOIN category c ON c.id = mc.category_id
WHERE m.slug IN ('el-viaje-chapin','leyendas-del-lago')
GROUP BY m.slug
ORDER BY m.slug;

-- 12) Borrado lógico de categoría "chapina"
SELECT fn_category_soft_delete((SELECT id FROM category WHERE slug='chapina'));

SELECT name, slug, is_active FROM category WHERE slug='chapina';

-- 13) Desactivar / activar película
SELECT fn_movie_set_active((SELECT id FROM movie WHERE slug='el-viaje-chapin'), FALSE);
SELECT slug, is_active FROM movie WHERE slug='el-viaje-chapin';

SELECT fn_movie_set_active((SELECT id FROM movie WHERE slug='el-viaje-chapin'), TRUE);
SELECT slug, is_active FROM movie WHERE slug='el-viaje-chapin';

-- 14) Reemplazar categorías de una película (idempotente)
SELECT fn_movie_set_categories(
  (SELECT id FROM movie WHERE slug='el-viaje-chapin'),
  ARRAY['viaje','guatemala']
);

SELECT c.slug
FROM category c
JOIN movie_category mc ON mc.category_id = c.id
JOIN movie m ON m.id = mc.movie_id
WHERE m.slug='el-viaje-chapin'
ORDER BY c.slug;

-- Fin de pruebas.
SELECT slug, available_from, available_until
FROM content.movie
WHERE slug = 'el-viaje-chapin';


ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_content_handler BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users SET is_paid = true WHERE username = 'beto1';
UPDATE users SET is_content_handler = true WHERE username = 'beto1';
UPDATE users SET is_admin = true WHERE username = 'beto1';






-- =========================================================
-- Servicio de Gestión de Usuarios
-- PostgreSQL 14+
-- Funcionalidades incluidas (solo admin; sin registro de usuarios):
-- 1) Listado y búsqueda con paginación/orden/filtros + contadores rápidos
-- 2) Detalle de usuario (perfil + resumen de verificación/sesiones)
-- 3) Edición de flags y estado de la cuenta (is_active, is_verified, is_paid,
--    is_admin con salvaguarda del "último admin", is_content_handler)
-- =========================================================


-- =========================================================
-- 1) LISTADO, BÚSQUEDA Y CONTADORES
-- =========================================================

-- Listado + filtros + paginación + orden seguro
-- Nota: total_count se repite por fila (útil para UI).
CREATE OR REPLACE FUNCTION fn_admin_users_list(
  p_query              TEXT DEFAULT NULL,             -- busca en email/username
  p_created_from       TIMESTAMPTZ DEFAULT NULL,      -- rango creado desde
  p_created_to         TIMESTAMPTZ DEFAULT NULL,      -- rango creado hasta (inclusive día si pasas fecha a las 23:59:59)
  p_is_active          BOOLEAN DEFAULT NULL,
  p_is_verified        BOOLEAN DEFAULT NULL,
  p_is_paid            BOOLEAN DEFAULT NULL,
  p_is_admin           BOOLEAN DEFAULT NULL,
  p_is_content_handler BOOLEAN DEFAULT NULL,
  p_two_fa_enabled     BOOLEAN DEFAULT NULL,
  p_locked_only        BOOLEAN DEFAULT NULL,          -- TRUE: solo bloqueados vigentes (locked_until > now)
  p_failed_login_min   INTEGER DEFAULT NULL,          -- e.g., 5
  p_order_by           TEXT DEFAULT 'created_at',     -- columnas permitidas abajo
  p_order_dir          TEXT DEFAULT 'DESC',           -- ASC/DESC
  p_limit              INTEGER DEFAULT 50,
  p_offset             INTEGER DEFAULT 0
)
RETURNS TABLE (
  total_count            BIGINT,
  id                     INTEGER,
  email                  TEXT,
  username               TEXT,
  first_name             TEXT,
  last_name              TEXT,
  is_active              BOOLEAN,
  is_verified            BOOLEAN,
  is_paid                BOOLEAN,
  is_admin               BOOLEAN,
  is_content_handler     BOOLEAN,
  two_fa_enabled         BOOLEAN,
  failed_login_attempts  INTEGER,
  locked_until           TIMESTAMP,
  created_at             TIMESTAMP,
  updated_at             TIMESTAMP
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sql TEXT;
  v_where TEXT := 'WHERE 1=1';
  v_order_col TEXT := 'created_at';
  v_order_dir TEXT := 'DESC';
BEGIN
  -- Whitelist de columnas ordenables
  IF lower(p_order_by) IN ('id','email','username','first_name','last_name',
                           'is_active','is_verified','is_paid','is_admin',
                           'is_content_handler','two_fa_enabled',
                           'failed_login_attempts','locked_until','created_at','updated_at') THEN
    v_order_col := lower(p_order_by);
  END IF;

  -- Dirección de orden
  IF upper(p_order_dir) IN ('ASC','DESC') THEN
    v_order_dir := upper(p_order_dir);
  END IF;

  -- Filtros
  IF p_query IS NOT NULL AND length(btrim(p_query)) > 0 THEN
    v_where := v_where || ' AND (email ILIKE %L OR username ILIKE %L)';
    v_where := format(v_where, '%'||p_query||'%', '%'||p_query||'%');
  END IF;

  IF p_created_from IS NOT NULL THEN
    v_where := v_where || format(' AND created_at >= %L::timestamptz', p_created_from);
  END IF;

  IF p_created_to IS NOT NULL THEN
    v_where := v_where || format(' AND created_at <= %L::timestamptz', p_created_to);
  END IF;

  IF p_is_active IS NOT NULL THEN
    v_where := v_where || format(' AND is_active = %L', p_is_active);
  END IF;

  IF p_is_verified IS NOT NULL THEN
    v_where := v_where || format(' AND is_verified = %L', p_is_verified);
  END IF;

  IF p_is_paid IS NOT NULL THEN
    v_where := v_where || format(' AND is_paid = %L', p_is_paid);
  END IF;

  IF p_is_admin IS NOT NULL THEN
    v_where := v_where || format(' AND is_admin = %L', p_is_admin);
  END IF;

  IF p_is_content_handler IS NOT NULL THEN
    v_where := v_where || format(' AND is_content_handler = %L', p_is_content_handler);
  END IF;

  IF p_two_fa_enabled IS NOT NULL THEN
    v_where := v_where || format(' AND two_fa_enabled = %L', p_two_fa_enabled);
  END IF;

  IF p_locked_only IS TRUE THEN
    v_where := v_where || ' AND locked_until IS NOT NULL AND locked_until > now()';
  ELSIF p_locked_only IS FALSE THEN
    v_where := v_where || ' AND (locked_until IS NULL OR locked_until <= now())';
  END IF;

  IF p_failed_login_min IS NOT NULL THEN
    v_where := v_where || format(' AND failed_login_attempts >= %s', p_failed_login_min);
  END IF;

  v_sql := format($q$
    SELECT
      COUNT(*) OVER() AS total_count,
      id, email, username, first_name, last_name,
      is_active, is_verified, is_paid, is_admin, is_content_handler,
      two_fa_enabled, failed_login_attempts, locked_until, created_at, updated_at
    FROM users
    %s
    ORDER BY %I %s
    LIMIT %s
    OFFSET %s
  $q$, v_where, v_order_col, v_order_dir, GREATEST(p_limit,0), GREATEST(p_offset,0));

  RETURN QUERY EXECUTE v_sql;
END$$;


-- Contadores rápidos (totales por flag/estado)
CREATE OR REPLACE FUNCTION fn_admin_users_counters(
  p_failed_login_min INTEGER DEFAULT 5
)
RETURNS TABLE (
  count_total              BIGINT,
  count_active             BIGINT,
  count_verified           BIGINT,
  count_paid               BIGINT,
  count_admin              BIGINT,
  count_content_handler    BIGINT,
  count_twofa_enabled      BIGINT,
  count_locked             BIGINT,
  count_failed_ge_n        BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    (SELECT COUNT(*) FROM users) AS count_total,
    (SELECT COUNT(*) FROM users WHERE is_active IS TRUE) AS count_active,
    (SELECT COUNT(*) FROM users WHERE is_verified IS TRUE) AS count_verified,
    (SELECT COUNT(*) FROM users WHERE is_paid IS TRUE) AS count_paid,
    (SELECT COUNT(*) FROM users WHERE is_admin IS TRUE) AS count_admin,
    (SELECT COUNT(*) FROM users WHERE is_content_handler IS TRUE) AS count_content_handler,
    (SELECT COUNT(*) FROM users WHERE two_fa_enabled IS TRUE) AS count_twofa_enabled,
    (SELECT COUNT(*) FROM users WHERE locked_until IS NOT NULL AND locked_until > now()) AS count_locked,
    (SELECT COUNT(*) FROM users WHERE failed_login_attempts >= p_failed_login_min) AS count_failed_ge_n;
$$;


-- =========================================================
-- 2) DETALLE DE USUARIO (perfil + resumen verificación/sesiones)
-- =========================================================
CREATE OR REPLACE FUNCTION fn_admin_user_detail(
  p_user_id INTEGER
)
RETURNS TABLE (
  id                       INTEGER,
  email                    TEXT,
  username                 TEXT,
  first_name               TEXT,
  last_name                TEXT,
  is_active                BOOLEAN,
  is_verified              BOOLEAN,
  is_paid                  BOOLEAN,
  is_admin                 BOOLEAN,
  is_content_handler       BOOLEAN,
  two_fa_enabled           BOOLEAN,
  failed_login_attempts    INTEGER,
  locked_until             TIMESTAMP,
  created_at               TIMESTAMP,
  updated_at               TIMESTAMP,
  email_tokens_total       BIGINT,
  email_tokens_active      BIGINT,     -- expires_at > now()
  refresh_tokens_total     BIGINT,
  refresh_tokens_active    BIGINT      -- expires_at > now()
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id, u.email, u.username, u.first_name, u.last_name,
    u.is_active, u.is_verified, u.is_paid, u.is_admin, u.is_content_handler,
    u.two_fa_enabled, u.failed_login_attempts, u.locked_until,
    u.created_at, u.updated_at,
    COALESCE(ev.total_cnt, 0) AS email_tokens_total,
    COALESCE(ev.active_cnt, 0) AS email_tokens_active,
    COALESCE(rt.total_cnt, 0) AS refresh_tokens_total,
    COALESCE(rt.active_cnt, 0) AS refresh_tokens_active
  FROM users u
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_cnt,
      COUNT(*) FILTER (WHERE expires_at > now()) AS active_cnt
    FROM email_verification_tokens evt
    WHERE evt.user_id = u.id
  ) ev ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_cnt,
      COUNT(*) FILTER (WHERE expires_at > now()) AS active_cnt
    FROM refresh_tokens r
    WHERE r.user_id = u.id
  ) rt ON TRUE
  WHERE u.id = p_user_id;
END$$;


-- =========================================================
-- 3) EDICIÓN DE FLAGS Y ESTADO
-- (Cada función actualiza updated_at = now())
-- =========================================================

-- Activar/Desactivar cuenta
CREATE OR REPLACE FUNCTION fn_admin_user_set_active(
  p_user_id INTEGER,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
     SET is_active = p_is_active,
         updated_at = now()
   WHERE id = p_user_id;
END$$;


-- Verificar / Desverificar
CREATE OR REPLACE FUNCTION fn_admin_user_set_verified(
  p_user_id INTEGER,
  p_is_verified BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
     SET is_verified = p_is_verified,
         updated_at = now()
   WHERE id = p_user_id;
END$$;


-- Marcar como pagado / no pagado
CREATE OR REPLACE FUNCTION fn_admin_user_set_paid(
  p_user_id INTEGER,
  p_is_paid BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
     SET is_paid = p_is_paid,
         updated_at = now()
   WHERE id = p_user_id;
END$$;


-- Asignar/Quitar rol admin, con salvaguarda del "último admin"
CREATE OR REPLACE FUNCTION fn_admin_user_set_admin(
  p_user_id INTEGER,
  p_is_admin BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_current_admin BOOLEAN;
  v_admin_count INTEGER;
BEGIN
  -- Estado actual del target
  SELECT is_admin INTO v_is_current_admin FROM users WHERE id = p_user_id;

  -- Si vamos a quitar admin y el usuario actualmente es admin:
  IF v_is_current_admin IS TRUE AND p_is_admin IS FALSE THEN
    SELECT COUNT(*) INTO v_admin_count FROM users WHERE is_admin IS TRUE;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Operación no permitida: no se puede quitar el rol admin del último administrador.';
    END IF;
  END IF;

  UPDATE users
     SET is_admin = p_is_admin,
         updated_at = now()
   WHERE id = p_user_id;
END$$;


-- Asignar/Quitar rol content handler
CREATE OR REPLACE FUNCTION fn_admin_user_set_content_handler(
  p_user_id INTEGER,
  p_is_content_handler BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
     SET is_content_handler = p_is_content_handler,
         updated_at = now()
   WHERE id = p_user_id;
END$$;



CREATE OR REPLACE FUNCTION fn_admin_users_list(
  p_query              TEXT DEFAULT NULL,
  p_created_from       TIMESTAMPTZ DEFAULT NULL,
  p_created_to         TIMESTAMPTZ DEFAULT NULL,
  p_is_active          BOOLEAN DEFAULT NULL,
  p_is_verified        BOOLEAN DEFAULT NULL,
  p_is_paid            BOOLEAN DEFAULT NULL,
  p_is_admin           BOOLEAN DEFAULT NULL,
  p_is_content_handler BOOLEAN DEFAULT NULL,
  p_two_fa_enabled     BOOLEAN DEFAULT NULL,
  p_locked_only        BOOLEAN DEFAULT NULL,
  p_failed_login_min   INTEGER DEFAULT NULL,
  p_order_by           TEXT DEFAULT 'created_at',
  p_order_dir          TEXT DEFAULT 'DESC',
  p_limit              INTEGER DEFAULT 50,
  p_offset             INTEGER DEFAULT 0
)
RETURNS TABLE (
  total_count            BIGINT,
  id                     INTEGER,
  email                  TEXT,
  username               TEXT,
  first_name             TEXT,
  last_name              TEXT,
  is_active              BOOLEAN,
  is_verified            BOOLEAN,
  is_paid                BOOLEAN,
  is_admin               BOOLEAN,
  is_content_handler     BOOLEAN,
  two_fa_enabled         BOOLEAN,
  failed_login_attempts  INTEGER,
  locked_until           TIMESTAMP,
  created_at             TIMESTAMP,
  updated_at             TIMESTAMP
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sql TEXT;
  v_where TEXT := 'WHERE 1=1';
  v_order_col TEXT := 'created_at';
  v_order_dir TEXT := 'DESC';
BEGIN
  IF lower(p_order_by) IN ('id','email','username','first_name','last_name',
                           'is_active','is_verified','is_paid','is_admin',
                           'is_content_handler','two_fa_enabled',
                           'failed_login_attempts','locked_until','created_at','updated_at') THEN
    v_order_col := lower(p_order_by);
  END IF;

  IF upper(p_order_dir) IN ('ASC','DESC') THEN
    v_order_dir := upper(p_order_dir);
  END IF;

  IF p_query IS NOT NULL AND length(btrim(p_query)) > 0 THEN
    v_where := v_where || ' AND (email ILIKE %L OR username ILIKE %L)';
    v_where := format(v_where, '%'||p_query||'%', '%'||p_query||'%');
  END IF;

  IF p_created_from IS NOT NULL THEN
    v_where := v_where || format(' AND created_at >= %L::timestamptz', p_created_from);
  END IF;

  IF p_created_to IS NOT NULL THEN
    v_where := v_where || format(' AND created_at <= %L::timestamptz', p_created_to);
  END IF;

  IF p_is_active IS NOT NULL THEN
    v_where := v_where || format(' AND is_active = %L', p_is_active);
  END IF;
  IF p_is_verified IS NOT NULL THEN
    v_where := v_where || format(' AND is_verified = %L', p_is_verified);
  END IF;
  IF p_is_paid IS NOT NULL THEN
    v_where := v_where || format(' AND is_paid = %L', p_is_paid);
  END IF;
  IF p_is_admin IS NOT NULL THEN
    v_where := v_where || format(' AND is_admin = %L', p_is_admin);
  END IF;
  IF p_is_content_handler IS NOT NULL THEN
    v_where := v_where || format(' AND is_content_handler = %L', p_is_content_handler);
  END IF;
  IF p_two_fa_enabled IS NOT NULL THEN
    v_where := v_where || format(' AND two_fa_enabled = %L', p_two_fa_enabled);
  END IF;

  IF p_locked_only IS TRUE THEN
    v_where := v_where || ' AND locked_until IS NOT NULL AND locked_until > now()';
  ELSIF p_locked_only IS FALSE THEN
    v_where := v_where || ' AND (locked_until IS NULL OR locked_until <= now())';
  END IF;

  IF p_failed_login_min IS NOT NULL THEN
    v_where := v_where || format(' AND failed_login_attempts >= %s', p_failed_login_min);
  END IF;

  v_sql := format($q$
    SELECT
      COUNT(*) OVER() AS total_count,
      id,
      email::text         AS email,
      username::text      AS username,
      first_name::text    AS first_name,
      last_name::text     AS last_name,
      is_active,
      is_verified,
      is_paid,
      is_admin,
      is_content_handler,
      two_fa_enabled,
      failed_login_attempts,
      locked_until,
      created_at,
      updated_at
    FROM public.users
    %s
    ORDER BY %I %s
    LIMIT %s
    OFFSET %s
  $q$, v_where, v_order_col, v_order_dir, GREATEST(p_limit,0), GREATEST(p_offset,0));

  RETURN QUERY EXECUTE v_sql;
END$$;


CREATE OR REPLACE FUNCTION fn_admin_user_detail(
  p_user_id INTEGER
)
RETURNS TABLE (
  id                       INTEGER,
  email                    TEXT,
  username                 TEXT,
  first_name               TEXT,
  last_name                TEXT,
  is_active                BOOLEAN,
  is_verified              BOOLEAN,
  is_paid                  BOOLEAN,
  is_admin                 BOOLEAN,
  is_content_handler       BOOLEAN,
  two_fa_enabled           BOOLEAN,
  failed_login_attempts    INTEGER,
  locked_until             TIMESTAMP,
  created_at               TIMESTAMP,
  updated_at               TIMESTAMP,
  email_tokens_total       BIGINT,
  email_tokens_active      BIGINT,
  refresh_tokens_total     BIGINT,
  refresh_tokens_active    BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    u.username::text,
    u.first_name::text,
    u.last_name::text,
    u.is_active,
    u.is_verified,
    u.is_paid,
    u.is_admin,
    u.is_content_handler,
    u.two_fa_enabled,
    u.failed_login_attempts,
    u.locked_until,
    u.created_at,
    u.updated_at,
    COALESCE(ev.total_cnt, 0) AS email_tokens_total,
    COALESCE(ev.active_cnt, 0) AS email_tokens_active,
    COALESCE(rt.total_cnt, 0) AS refresh_tokens_total,
    COALESCE(rt.active_cnt, 0) AS refresh_tokens_active
  FROM public.users u
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_cnt,
      COUNT(*) FILTER (WHERE expires_at > now()) AS active_cnt
    FROM public.email_verification_tokens evt
    WHERE evt.user_id = u.id
  ) ev ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_cnt,
      COUNT(*) FILTER (WHERE expires_at > now()) AS active_cnt
    FROM public.refresh_tokens r
    WHERE r.user_id = u.id
  ) rt ON TRUE
  WHERE u.id = p_user_id;
END$$;








-- =========================================================
-- Chapinflix - Microservicio Ver Catálogo
-- PostgreSQL 14+
-- Funciones mínimas según enunciado:
-- - Vistos recientemente
-- - Más populares
-- - Top 15
-- - Recientemente agregados
-- - Ver otra vez
-- - Películas por categoría
-- =========================================================

SET search_path TO content, public;

-- =========================================================
-- FUNCIONES BASE PARA CARRUSELES
-- =========================================================

-- 1) Más populares (por view_count)
CREATE OR REPLACE FUNCTION fn_catalog_most_popular(
  p_user_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  movie_id UUID,
  title TEXT,
  slug TEXT,
  synopsis_short TEXT,
  poster_url TEXT,
  classification_code TEXT,
  duration_minutes INTEGER,
  is_free BOOLEAN,
  view_count BIGINT
)
LANGUAGE sql
AS $BODY$
  SELECT
    m.id AS movie_id,
    m.title,
    m.slug,
    m.synopsis_short,
    m.poster_url,
    c.code AS classification_code,
    m.duration_minutes,
    m.is_free,
    m.view_count
  FROM movie m
  LEFT JOIN classification c ON c.id = m.classification_id
  WHERE m.is_active = TRUE
    AND (m.available_from IS NULL OR m.available_from <= now())
    AND (m.available_until IS NULL OR m.available_until >= now())
    AND (p_user_id IS NULL OR m.is_free = TRUE OR EXISTS(
      SELECT 1 FROM users u WHERE u.id = p_user_id AND u.is_paid = TRUE
    ))
  ORDER BY m.view_count DESC
  LIMIT p_limit;
$BODY$;

-- 2) Top 15 (igual que más populares pero limitado a 15)
CREATE OR REPLACE FUNCTION fn_catalog_top_15(
  p_user_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  movie_id UUID,
  title TEXT,
  slug TEXT,
  synopsis_short TEXT,
  poster_url TEXT,
  classification_code TEXT,
  duration_minutes INTEGER,
  is_free BOOLEAN,
  view_count BIGINT
)
LANGUAGE sql
AS $BODY$
  SELECT * FROM fn_catalog_most_popular(p_user_id, 15);
$BODY$;

-- 3) Recientemente agregados (por upload_date)
CREATE OR REPLACE FUNCTION fn_catalog_recently_added(
  p_user_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  movie_id UUID,
  title TEXT,
  slug TEXT,
  synopsis_short TEXT,
  poster_url TEXT,
  classification_code TEXT,
  duration_minutes INTEGER,
  is_free BOOLEAN,
  upload_date TIMESTAMPTZ
)
LANGUAGE sql
AS $BODY$
  SELECT
    m.id AS movie_id,
    m.title,
    m.slug,
    m.synopsis_short,
    m.poster_url,
    c.code AS classification_code,
    m.duration_minutes,
    m.is_free,
    m.upload_date
  FROM movie m
  LEFT JOIN classification c ON c.id = m.classification_id
  WHERE m.is_active = TRUE
    AND (m.available_from IS NULL OR m.available_from <= now())
    AND (m.available_until IS NULL OR m.available_until >= now())
    AND (p_user_id IS NULL OR m.is_free = TRUE OR EXISTS(
      SELECT 1 FROM users u WHERE u.id = p_user_id AND u.is_paid = TRUE
    ))
  ORDER BY m.upload_date DESC
  LIMIT p_limit;
$BODY$;

-- 4) Vistos recientemente (requiere user_id)
-- Nota: view_history.user_id es UUID, necesitamos convertir correctamente
CREATE OR REPLACE FUNCTION fn_catalog_recently_watched(
  p_user_id INTEGER,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  movie_id UUID,
  title TEXT,
  slug TEXT,
  synopsis_short TEXT,
  poster_url TEXT,
  classification_code TEXT,
  duration_minutes INTEGER,
  is_free BOOLEAN,
  last_viewed TIMESTAMPTZ
)
LANGUAGE sql
AS $BODY$
  SELECT DISTINCT ON (m.id)
    m.id AS movie_id,
    m.title,
    m.slug,
    m.synopsis_short,
    m.poster_url,
    c.code AS classification_code,
    m.duration_minutes,
    m.is_free,
    MAX(vh.viewed_at) AS last_viewed
  FROM view_history vh
  JOIN movie m ON m.id = vh.movie_id
  LEFT JOIN classification c ON c.id = m.classification_id
  WHERE vh.user_id = ('00000000-0000-0000-0000-' || LPAD(p_user_id::text, 12, '0'))::uuid
    AND m.is_active = TRUE
    AND (m.available_from IS NULL OR m.available_from <= now())
    AND (m.available_until IS NULL OR m.available_until >= now())
  GROUP BY m.id, m.title, m.slug, m.synopsis_short, m.poster_url,
           c.code, m.duration_minutes, m.is_free
  ORDER BY m.id, MAX(vh.viewed_at) DESC
  LIMIT p_limit;
$BODY$;

-- 5) Ver otra vez (películas vistas más de una vez)
CREATE OR REPLACE FUNCTION fn_catalog_watch_again(
  p_user_id INTEGER,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  movie_id UUID,
  title TEXT,
  slug TEXT,
  synopsis_short TEXT,
  poster_url TEXT,
  classification_code TEXT,
  duration_minutes INTEGER,
  is_free BOOLEAN,
  watch_count BIGINT
)
LANGUAGE sql
AS $BODY$
  SELECT
    m.id AS movie_id,
    m.title,
    m.slug,
    m.synopsis_short,
    m.poster_url,
    c.code AS classification_code,
    m.duration_minutes,
    m.is_free,
    COUNT(vh.id) AS watch_count
  FROM view_history vh
  JOIN movie m ON m.id = vh.movie_id
  LEFT JOIN classification c ON c.id = m.classification_id
  WHERE vh.user_id = ('00000000-0000-0000-0000-' || LPAD(p_user_id::text, 12, '0'))::uuid
    AND m.is_active = TRUE
    AND (m.available_from IS NULL OR m.available_from <= now())
    AND (m.available_until IS NULL OR m.available_until >= now())
  GROUP BY m.id, m.title, m.slug, m.synopsis_short, m.poster_url,
           c.code, m.duration_minutes, m.is_free
  HAVING COUNT(vh.id) > 1
  ORDER BY COUNT(vh.id) DESC
  LIMIT p_limit;
$BODY$;

-- 6) Películas por categoría
CREATE OR REPLACE FUNCTION fn_catalog_by_category(
  p_category_slug TEXT,
  p_user_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  movie_id UUID,
  title TEXT,
  slug TEXT,
  synopsis_short TEXT,
  poster_url TEXT,
  classification_code TEXT,
  duration_minutes INTEGER,
  is_free BOOLEAN
)
LANGUAGE sql
AS $BODY$
  SELECT
    m.id AS movie_id,
    m.title,
    m.slug,
    m.synopsis_short,
    m.poster_url,
    c.code AS classification_code,
    m.duration_minutes,
    m.is_free
  FROM movie m
  JOIN movie_category mc ON mc.movie_id = m.id
  JOIN category cat ON cat.id = mc.category_id
  LEFT JOIN classification c ON c.id = m.classification_id
  WHERE cat.slug = lower(p_category_slug)
    AND cat.is_active = TRUE
    AND m.is_active = TRUE
    AND (m.available_from IS NULL OR m.available_from <= now())
    AND (m.available_until IS NULL OR m.available_until >= now())
    AND (p_user_id IS NULL OR m.is_free = TRUE OR EXISTS(
      SELECT 1 FROM users u WHERE u.id = p_user_id AND u.is_paid = TRUE
    ))
  ORDER BY m.upload_date DESC
  LIMIT p_limit
  OFFSET p_offset;
$BODY$;

-- 7) Listar categorías disponibles (para el menú)
CREATE OR REPLACE FUNCTION fn_catalog_categories()
RETURNS TABLE (
  category_id UUID,
  name TEXT,
  slug TEXT,
  parent_id UUID
)
LANGUAGE sql
AS $BODY$
  SELECT
    c.id AS category_id,
    c.name,
    c.slug,
    c.parent_id
  FROM category c
  WHERE c.is_active = TRUE
  ORDER BY c.name;
$BODY$;

-- 8) Película destacada para encabezado (random de las más populares)
CREATE OR REPLACE FUNCTION fn_catalog_featured(
  p_user_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  movie_id UUID,
  title TEXT,
  slug TEXT,
  synopsis_short TEXT,
  synopsis_long TEXT,
  banner_url TEXT,
  poster_url TEXT,
  classification_code TEXT,
  duration_minutes INTEGER,
  is_free BOOLEAN
)
LANGUAGE sql
AS $BODY$
  SELECT
    m.id AS movie_id,
    m.title,
    m.slug,
    m.synopsis_short,
    m.synopsis_long,
    m.banner_url,
    m.poster_url,
    c.code AS classification_code,
    m.duration_minutes,
    m.is_free
  FROM movie m
  LEFT JOIN classification c ON c.id = m.classification_id
  WHERE m.is_active = TRUE
    AND m.banner_url IS NOT NULL
    AND (m.available_from IS NULL OR m.available_from <= now())
    AND (m.available_until IS NULL OR m.available_until >= now())
    AND (p_user_id IS NULL OR m.is_free = TRUE OR EXISTS(
      SELECT 1 FROM users u WHERE u.id = p_user_id AND u.is_paid = TRUE
    ))
  ORDER BY m.view_count DESC, random()
  LIMIT 1;
$BODY$;