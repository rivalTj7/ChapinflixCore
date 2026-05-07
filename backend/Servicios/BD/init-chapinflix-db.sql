-- =========================================================
-- ChapinFlix Database Schema for Cloud SQL PostgreSQL
-- =========================================================

-- -----------------------------
-- Create custom schema
-- -----------------------------
CREATE SCHEMA IF NOT EXISTS app;

-- -----------------------------
-- Tables
-- -----------------------------

-- Users table
CREATE TABLE IF NOT EXISTS app.app_users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_fa_secret TEXT,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_content_handler BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS app.email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens (JWT refresh)
CREATE TABLE IF NOT EXISTS app.refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------
-- Indexes
-- -----------------------------
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app.app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app.app_users(username);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON app.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON app.refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON app.refresh_tokens(user_id);

-- -----------------------------
-- Trigger for updated_at
-- -----------------------------
CREATE OR REPLACE FUNCTION app.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_users_updated_at 
    BEFORE UPDATE ON app.app_users 
    FOR EACH ROW 
    EXECUTE FUNCTION app.update_updated_at_column();

-- -----------------------------
-- Admin Functions
-- -----------------------------

-- List/search users with pagination & ordering
CREATE OR REPLACE FUNCTION app.fn_admin_users_list(
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
  id                     BIGINT,
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
  locked_until           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ
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
    FROM app.app_users
    %s
    ORDER BY %I %s
    LIMIT %s
    OFFSET %s
  $q$, v_where, v_order_col, v_order_dir, GREATEST(p_limit,0), GREATEST(p_offset,0));

  RETURN QUERY EXECUTE v_sql;
END$$;

-- Quick counters
CREATE OR REPLACE FUNCTION app.fn_admin_users_counters(
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
    (SELECT COUNT(*) FROM app.app_users) AS count_total,
    (SELECT COUNT(*) FROM app.app_users WHERE is_active IS TRUE) AS count_active,
    (SELECT COUNT(*) FROM app.app_users WHERE is_verified IS TRUE) AS count_verified,
    (SELECT COUNT(*) FROM app.app_users WHERE is_paid IS TRUE) AS count_paid,
    (SELECT COUNT(*) FROM app.app_users WHERE is_admin IS TRUE) AS count_admin,
    (SELECT COUNT(*) FROM app.app_users WHERE is_content_handler IS TRUE) AS count_content_handler,
    (SELECT COUNT(*) FROM app.app_users WHERE two_fa_enabled IS TRUE) AS count_twofa_enabled,
    (SELECT COUNT(*) FROM app.app_users WHERE locked_until IS NOT NULL AND locked_until > now()) AS count_locked,
    (SELECT COUNT(*) FROM app.app_users WHERE failed_login_attempts >= p_failed_login_min) AS count_failed_ge_n;
$$;

-- User detail + token summaries
CREATE OR REPLACE FUNCTION app.fn_admin_user_detail(
  p_user_id BIGINT
)
RETURNS TABLE (
  id                       BIGINT,
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
  locked_until             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ,
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
  FROM app.app_users u
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_cnt,
      COUNT(*) FILTER (WHERE expires_at > now()) AS active_cnt
    FROM app.email_verification_tokens evt
    WHERE evt.user_id = u.id
  ) ev ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_cnt,
      COUNT(*) FILTER (WHERE expires_at > now()) AS active_cnt
    FROM app.refresh_tokens r
    WHERE r.user_id = u.id
  ) rt ON TRUE
  WHERE u.id = p_user_id;
END$$;

-- Account/role flag updaters
CREATE OR REPLACE FUNCTION app.fn_admin_user_set_active(
  p_user_id BIGINT,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE app.app_users
     SET is_active = p_is_active,
         updated_at = now()
   WHERE id = p_user_id;
END$$;

CREATE OR REPLACE FUNCTION app.fn_admin_user_set_verified(
  p_user_id BIGINT,
  p_is_verified BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE app.app_users
     SET is_verified = p_is_verified,
         updated_at = now()
   WHERE id = p_user_id;
END$$;

CREATE OR REPLACE FUNCTION app.fn_admin_user_set_paid(
  p_user_id BIGINT,
  p_is_paid BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE app.app_users
     SET is_paid = p_is_paid,
         updated_at = now()
   WHERE id = p_user_id;
END$$;

CREATE OR REPLACE FUNCTION app.fn_admin_user_set_admin(
  p_user_id BIGINT,
  p_is_admin BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_current_admin BOOLEAN;
  v_admin_count INTEGER;
BEGIN
  SELECT is_admin INTO v_is_current_admin
  FROM app.app_users WHERE id = p_user_id;

  IF v_is_current_admin IS TRUE AND p_is_admin IS FALSE THEN
    SELECT COUNT(*) INTO v_admin_count FROM app.app_users WHERE is_admin IS TRUE;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Operación no permitida: no se puede quitar el rol admin del último administrador.';
    END IF;
  END IF;

  UPDATE app.app_users
     SET is_admin = p_is_admin,
         updated_at = now()
   WHERE id = p_user_id;
END$$;

CREATE OR REPLACE FUNCTION app.fn_admin_user_set_content_handler(
  p_user_id BIGINT,
  p_is_content_handler BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE app.app_users
     SET is_content_handler = p_is_content_handler,
         updated_at = now()
   WHERE id = p_user_id;
END$$;

-- -----------------------------
-- Insert test user
-- -----------------------------
-- Password: beto2025
-- Hash generated with bcrypt
INSERT INTO app.app_users (
    email, 
    username, 
    password_hash, 
    first_name, 
    last_name, 
    is_active, 
    is_verified, 
    is_admin
) VALUES (
    'beto@chapinflix.com',
    'beto',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaOBzS6',
    'Beto',
    'Admin',
    TRUE,
    TRUE,
    TRUE
) ON CONFLICT (username) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully!';
    RAISE NOTICE 'Test user created:';
    RAISE NOTICE '  Username: beto';
    RAISE NOTICE '  Password: beto2025';
    RAISE NOTICE '  Email: beto@chapinflix.com';
END$$;