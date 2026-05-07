-- database/init.sql
-- Script de inicialización para el schema de estadísticas
-- Base de datos: chapinflix_db
-- Schema existente: app (con app_users)

-- Crear schema para estadísticas
CREATE SCHEMA IF NOT EXISTS stats;

-- ==========================================
-- TABLA: user_subscriptions
-- Historial de suscripciones para estadísticas
-- ==========================================
CREATE TABLE IF NOT EXISTS stats.user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
    subscription_type VARCHAR(50) NOT NULL DEFAULT 'monthly', -- 'monthly', 'annual', 'free_trial'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    amount_paid DECIMAL(10, 2), -- precio pagado
    currency VARCHAR(10) DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_subs_user_id ON stats.user_subscriptions(user_id);
CREATE INDEX idx_user_subs_status ON stats.user_subscriptions(status);
CREATE INDEX idx_user_subs_started ON stats.user_subscriptions(started_at);
CREATE INDEX idx_user_subs_type ON stats.user_subscriptions(subscription_type);

COMMENT ON TABLE stats.user_subscriptions IS 'Historial completo de suscripciones para reportes estadísticos';
COMMENT ON COLUMN stats.user_subscriptions.status IS 'active: suscripción vigente, cancelled: cancelada por usuario, expired: venció';

-- ==========================================
-- TABLA: content_views
-- Registro de visualizaciones de contenido
-- ==========================================
CREATE TABLE IF NOT EXISTS stats.content_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
    content_id VARCHAR(100) NOT NULL, -- MongoDB ObjectId como string
    content_type VARCHAR(20) NOT NULL DEFAULT 'movie', -- 'movie', 'series', 'episode'
    content_title VARCHAR(255),
    content_slug VARCHAR(255),
    genre VARCHAR(100), -- género principal o lista separada por comas
    view_duration_seconds INTEGER DEFAULT 0, -- cuántos segundos vio
    total_duration_seconds INTEGER, -- duración total del contenido
    completed BOOLEAN DEFAULT FALSE, -- si terminó de ver (> 90%)
    -- Datos demográficos para estadísticas (denormalizados)
    user_age_group VARCHAR(20), -- '13-17', '18-24', '25-34', '35-44', '45-54', '55+'
    user_gender VARCHAR(20), -- 'male', 'female', 'other', 'prefer_not_to_say'
    -- Metadatos
    device_type VARCHAR(50), -- 'web', 'mobile_android', 'mobile_ios', 'tablet'
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_views_user ON stats.content_views(user_id);
CREATE INDEX idx_content_views_content ON stats.content_views(content_id);
CREATE INDEX idx_content_views_date ON stats.content_views(viewed_at);
CREATE INDEX idx_content_views_genre ON stats.content_views(genre);
CREATE INDEX idx_content_views_age_group ON stats.content_views(user_age_group);
CREATE INDEX idx_content_views_gender ON stats.content_views(user_gender);
CREATE INDEX idx_content_views_completed ON stats.content_views(completed);

COMMENT ON TABLE stats.content_views IS 'Registro de cada visualización de contenido por usuario';
COMMENT ON COLUMN stats.content_views.completed IS 'TRUE si el usuario vio más del 90% del contenido';

-- ==========================================
-- TABLA: content_likes
-- Likes y dislikes de contenido
-- ==========================================
CREATE TABLE IF NOT EXISTS stats.content_likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
    content_id VARCHAR(100) NOT NULL, -- MongoDB ObjectId
    content_type VARCHAR(20) NOT NULL DEFAULT 'movie',
    content_title VARCHAR(255),
    like_type VARCHAR(10) NOT NULL CHECK (like_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, content_id)
);

CREATE INDEX idx_likes_user ON stats.content_likes(user_id);
CREATE INDEX idx_likes_content ON stats.content_likes(content_id);
CREATE INDEX idx_likes_type ON stats.content_likes(like_type);
CREATE INDEX idx_likes_created ON stats.content_likes(created_at);

COMMENT ON TABLE stats.content_likes IS 'Likes y dislikes de usuarios en contenido';
COMMENT ON CONSTRAINT content_likes_user_id_content_id_key ON stats.content_likes IS 'Un usuario solo puede dar un like o dislike por contenido';

-- ==========================================
-- TRIGGER: updated_at automático
-- ==========================================
CREATE OR REPLACE FUNCTION stats.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON stats.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION stats.update_updated_at_column();

CREATE TRIGGER update_content_likes_updated_at 
    BEFORE UPDATE ON stats.content_likes
    FOR EACH ROW EXECUTE FUNCTION stats.update_updated_at_column();

-- ==========================================
-- DATOS DE PRUEBA
-- ==========================================

-- Insertar suscripción de prueba para el usuario beto (id=1)
INSERT INTO stats.user_subscriptions (user_id, subscription_type, status, started_at, expires_at, amount_paid)
VALUES 
    (1, 'monthly', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 9.99),
    (1, 'monthly', 'expired', NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', 9.99)
ON CONFLICT DO NOTHING;

-- Insertar visualizaciones de prueba
INSERT INTO stats.content_views (
    user_id, content_id, content_type, content_title, content_slug, 
    genre, view_duration_seconds, total_duration_seconds, completed,
    user_age_group, user_gender, device_type
)
VALUES 
    (1, '507f1f77bcf86cd799439011', 'movie', 'Película de Prueba 1', 'pelicula-prueba-1', 
     'Action,Adventure', 5400, 7200, true, '25-34', 'male', 'web'),
    (1, '507f1f77bcf86cd799439012', 'movie', 'Película de Prueba 2', 'pelicula-prueba-2',
     'Comedy', 3600, 5400, false, '25-34', 'male', 'mobile_android'),
    (1, '507f1f77bcf86cd799439013', 'movie', 'Película de Prueba 3', 'pelicula-prueba-3',
     'Drama', 6000, 6300, true, '25-34', 'male', 'web')
ON CONFLICT DO NOTHING;

-- Insertar likes de prueba
INSERT INTO stats.content_likes (user_id, content_id, content_type, content_title, like_type)
VALUES 
    (1, '507f1f77bcf86cd799439011', 'movie', 'Película de Prueba 1', 'like'),
    (1, '507f1f77bcf86cd799439012', 'movie', 'Película de Prueba 2', 'dislike')
ON CONFLICT (user_id, content_id) DO NOTHING;

-- ==========================================
-- VISTAS ÚTILES PARA REPORTES
-- ==========================================

-- Vista: Suscripciones activas actuales
CREATE OR REPLACE VIEW stats.v_active_subscriptions AS
SELECT 
    s.id,
    s.user_id,
    u.username,
    u.email,
    s.subscription_type,
    s.started_at,
    s.expires_at,
    s.amount_paid
FROM stats.user_subscriptions s
JOIN app.app_users u ON s.user_id = u.id
WHERE s.status = 'active'
  AND (s.expires_at IS NULL OR s.expires_at > NOW());

-- Vista: Top películas más vistas
CREATE OR REPLACE VIEW stats.v_top_content AS
SELECT 
    content_id,
    content_title,
    content_type,
    genre,
    COUNT(*) as view_count,
    SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_count,
    AVG(view_duration_seconds) as avg_view_duration
FROM stats.content_views
GROUP BY content_id, content_title, content_type, genre
ORDER BY view_count DESC;

-- Vista: Likes y dislikes por contenido
CREATE OR REPLACE VIEW stats.v_content_reactions AS
SELECT 
    content_id,
    content_title,
    content_type,
    COUNT(CASE WHEN like_type = 'like' THEN 1 END) as likes,
    COUNT(CASE WHEN like_type = 'dislike' THEN 1 END) as dislikes,
    COUNT(*) as total_reactions
FROM stats.content_likes
GROUP BY content_id, content_title, content_type
ORDER BY (COUNT(CASE WHEN like_type = 'like' THEN 1 END) - COUNT(CASE WHEN like_type = 'dislike' THEN 1 END)) DESC;

COMMENT ON VIEW stats.v_active_subscriptions IS 'Suscripciones actualmente vigentes';
COMMENT ON VIEW stats.v_top_content IS 'Contenido más visto ordenado por cantidad de visualizaciones';
COMMENT ON VIEW stats.v_content_reactions IS 'Resumen de likes y dislikes por contenido';