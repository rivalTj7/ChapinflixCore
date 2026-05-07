# Microservicio de Estadísticas - ChapinFlix

## Estructura de Directorios

```
sa-estadisticas/
├── main.py
├── authkit.py                 (mismo que tienes)
├── db.py                      (conexión PostgreSQL)
├── metrics.py                 (Prometheus metrics)
├── requirements.txt
├── Dockerfile
├── .env.example
├── models/
│   ├── __init__.py
│   └── schemas.py            (Pydantic models)
├── routers/
│   ├── __init__.py
│   └── stats.py              (endpoints de estadísticas)
└── database/
    └── init.sql              (DDL para crear tablas)

```

## Base de Datos - Schema SQL

### Tablas Necesarias

1. **user_subscriptions**: Suscripciones de usuarios
2. **content_views**: Visualizaciones de contenido
3. **content_likes**: Likes y dislikes

### Script SQL de Inicialización

```sql
-- database/init.sql
CREATE SCHEMA IF NOT EXISTS stats;

-- Tabla de suscripciones
CREATE TABLE IF NOT EXISTS stats.user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    subscription_type VARCHAR(50) NOT NULL, -- 'monthly', 'annual', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_subs_user_id ON stats.user_subscriptions(user_id);
CREATE INDEX idx_user_subs_status ON stats.user_subscriptions(status);
CREATE INDEX idx_user_subs_started ON stats.user_subscriptions(started_at);

-- Tabla de visualizaciones
CREATE TABLE IF NOT EXISTS stats.content_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    content_id VARCHAR(100) NOT NULL, -- MongoDB ObjectId como string
    content_type VARCHAR(20) NOT NULL DEFAULT 'movie', -- 'movie', 'series'
    content_title VARCHAR(255),
    genre VARCHAR(50), -- género principal
    view_duration_seconds INTEGER, -- cuánto tiempo vio
    completed BOOLEAN DEFAULT FALSE, -- si terminó de ver
    user_age_group VARCHAR(20), -- '18-25', '26-35', etc.
    user_gender VARCHAR(20), -- 'male', 'female', 'other'
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_views_user ON stats.content_views(user_id);
CREATE INDEX idx_content_views_content ON stats.content_views(content_id);
CREATE INDEX idx_content_views_date ON stats.content_views(viewed_at);
CREATE INDEX idx_content_views_genre ON stats.content_views(genre);

-- Tabla de likes/dislikes
CREATE TABLE IF NOT EXISTS stats.content_likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    content_id VARCHAR(100) NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'movie',
    like_type VARCHAR(10) NOT NULL, -- 'like' o 'dislike'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, content_id)
);

CREATE INDEX idx_likes_user ON stats.content_likes(user_id);
CREATE INDEX idx_likes_content ON stats.content_likes(content_id);
CREATE INDEX idx_likes_type ON stats.content_likes(like_type);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON stats.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_likes_updated_at BEFORE UPDATE ON stats.content_likes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Endpoints del Servicio

### Endpoints de Administrador

1. **GET /stats/views/top-content** - Películas/series más vistas
2. **GET /stats/views/by-genre** - Géneros más visualizados
3. **GET /stats/views/demographics** - Segregación por género y edad
4. **GET /stats/subscriptions/current** - Usuarios actualmente suscritos
5. **GET /stats/subscriptions/history** - Historial por mes
6. **GET /stats/subscriptions/new-monthly** - Nuevas suscripciones del mes
7. **GET /stats/subscriptions/new-yearly** - Nuevas suscripciones del año
8. **GET /stats/likes/summary** - Cantidad de likes y dislikes
9. **GET /stats/likes/top-content** - Contenido con más likes/dislikes

### Endpoints de Usuario

10. **POST /views/record** - Registrar visualización
11. **POST /likes/toggle** - Dar like/dislike
12. **GET /likes/my-likes** - Ver mis likes

## Puerto

- **Puerto 8030** (para no colisionar con los existentes)