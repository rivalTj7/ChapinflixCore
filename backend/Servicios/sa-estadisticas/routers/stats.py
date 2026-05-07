# ==========================================
# routers/stats.py - CORREGIDO CON NOMBRES DE COLUMNAS REALES
# ==========================================
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import asyncpg
from db import get_conn
from authkit import auth_required, admin_required, AuthContext
from models.schemas import (
    RecordViewRequest,
    RecordLikeRequest,
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    SubscriptionResponse,
    ViewResponse,
    LikeResponse,
    ContentStats,
    GenreStats,
    DemographicStats,
    SubscriptionStats,
    MonthlySubscriptionTrend,
    UserViewHistory,
    UserLikeHistory,
    MessageResponse
)
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stats", tags=["Statistics"])

# ==========================================
# ENDPOINTS DE ADMINISTRADOR
# ==========================================

@router.get("/admin/content/most-viewed", 
    response_model=List[ContentStats],
    dependencies=[Depends(admin_required)])
async def get_most_viewed_content(
    limit: int = Query(10, ge=1, le=100),
    content_type: Optional[str] = Query(None, regex="^(movie|series|episode)$"),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Obtener contenido más visto
    - Requiere rol admin
    """
    try:
        query = """
            SELECT 
                content_id,
                content_type,
                content_title,
                COUNT(*) as view_count,
                COUNT(DISTINCT user_id) as unique_viewers,
                ROUND(SUM(view_duration_seconds)::numeric / 3600, 2) as total_watch_time_hours,
                ROUND(AVG(CASE WHEN completed THEN 1.0 ELSE 0.0 END)::numeric, 2) as average_completion_rate
            FROM stats.content_views
        """
        
        if content_type:
            query += f" WHERE content_type = '{content_type}'"
        
        query += """
            GROUP BY content_id, content_type, content_title
            ORDER BY view_count DESC
            LIMIT $1
        """
        
        rows = await conn.fetch(query, limit)
        
        result = []
        for row in rows:
            # Obtener likes/dislikes
            likes_query = """
                SELECT 
                    COUNT(*) FILTER (WHERE like_type = 'like') as likes,
                    COUNT(*) FILTER (WHERE like_type = 'dislike') as dislikes
                FROM stats.content_likes
                WHERE content_id = $1
            """
            likes_row = await conn.fetchrow(likes_query, row['content_id'])
            
            result.append(ContentStats(
                content_id=row['content_id'],
                title=row['content_title'],
                view_count=row['view_count'],
                unique_viewers=row['unique_viewers'],
                total_watch_time_hours=float(row['total_watch_time_hours'] or 0),
                average_completion_rate=float(row['average_completion_rate'] or 0),
                likes=likes_row['likes'] or 0,
                dislikes=likes_row['dislikes'] or 0,
                net_likes=(likes_row['likes'] or 0) - (likes_row['dislikes'] or 0)
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting most viewed content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/genres/popular",
    response_model=List[GenreStats],
    dependencies=[Depends(admin_required)])
async def get_popular_genres(
    limit: int = Query(10, ge=1, le=50),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Géneros más vistos
    - Requiere rol admin
    """
    try:
        # Usar el campo 'genre' que ya existe en content_views
        query = """
            SELECT 
                genre,
                COUNT(*) as view_count,
                COUNT(DISTINCT user_id) as unique_viewers
            FROM stats.content_views
            WHERE genre IS NOT NULL AND genre != ''
            GROUP BY genre
            ORDER BY view_count DESC
            LIMIT $1
        """
        
        rows = await conn.fetch(query, limit)
        
        total_views = sum(row['view_count'] for row in rows) if rows else 0
        
        result = []
        for row in rows:
            percentage = (row['view_count'] / total_views * 100) if total_views > 0 else 0
            result.append(GenreStats(
                genre=row['genre'],
                view_count=row['view_count'],
                unique_viewers=row['unique_viewers'],
                percentage=round(percentage, 2)
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting popular genres: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/demographics",
    response_model=List[DemographicStats],
    dependencies=[Depends(admin_required)])
async def get_demographics(
    category: str = Query(..., regex="^(age|gender)$"),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Estadísticas demográficas
    - Requiere rol admin
    - category: 'age' o 'gender'
    - Usa datos denormalizados de content_views
    """
    try:
        if category == "age":
            query = """
                SELECT 
                    user_age_group as value,
                    COUNT(*) as view_count,
                    COUNT(DISTINCT user_id) as unique_viewers
                FROM stats.content_views
                WHERE user_age_group IS NOT NULL
                GROUP BY user_age_group
                ORDER BY view_count DESC
            """
            category_name = "age_group"
        else:  # gender
            query = """
                SELECT 
                    user_gender as value,
                    COUNT(*) as view_count,
                    COUNT(DISTINCT user_id) as unique_viewers
                FROM stats.content_views
                WHERE user_gender IS NOT NULL
                GROUP BY user_gender
                ORDER BY view_count DESC
            """
            category_name = "gender"
        
        rows = await conn.fetch(query)
        total_views = sum(row['view_count'] for row in rows) if rows else 0
        
        result = []
        for row in rows:
            percentage = (row['view_count'] / total_views * 100) if total_views > 0 else 0
            result.append(DemographicStats(
                category=category_name,
                value=row['value'] or 'Unknown',
                view_count=row['view_count'],
                unique_viewers=row['unique_viewers'],
                percentage=round(percentage, 2)
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting demographics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/subscriptions/current",
    response_model=SubscriptionStats,
    dependencies=[Depends(admin_required)])
async def get_subscription_stats(
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Estadísticas actuales de suscripciones
    - Requiere rol admin
    """
    try:
        query = """
            SELECT 
                COUNT(*) as total_subscribers,
                COUNT(*) FILTER (WHERE status = 'active') as active_subscribers,
                COUNT(*) FILTER (WHERE status = 'active' AND subscription_type = 'monthly') as monthly_subscribers,
                COUNT(*) FILTER (WHERE status = 'active' AND subscription_type = 'annual') as annual_subscribers,
                COUNT(*) FILTER (WHERE DATE_TRUNC('month', started_at) = DATE_TRUNC('month', CURRENT_DATE) AND status = 'active') as new_this_month,
                COUNT(*) FILTER (WHERE status = 'cancelled' AND DATE_TRUNC('month', cancelled_at) = DATE_TRUNC('month', CURRENT_DATE)) as churn_this_month
            FROM stats.user_subscriptions
        """
        
        row = await conn.fetchrow(query)
        
        return SubscriptionStats(
            total_subscribers=row['total_subscribers'],
            active_subscribers=row['active_subscribers'],
            monthly_subscribers=row['monthly_subscribers'],
            annual_subscribers=row['annual_subscribers'],
            new_this_month=row['new_this_month'],
            churn_this_month=row['churn_this_month']
        )
    
    except Exception as e:
        logger.error(f"Error getting subscription stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/subscriptions/trend",
    response_model=List[MonthlySubscriptionTrend],
    dependencies=[Depends(admin_required)])
async def get_subscription_trend(
    months: int = Query(12, ge=1, le=24),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Tendencia mensual de suscripciones
    - Requiere rol admin
    """
    try:
        query = """
            WITH months AS (
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE) - (n || ' months')::INTERVAL, 'YYYY-MM') as month
                FROM generate_series(0, $1 - 1) n
            ),
            new_subs AS (
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', started_at), 'YYYY-MM') as month,
                    COUNT(*) as new_subscriptions
                FROM stats.user_subscriptions
                WHERE status = 'active'
                GROUP BY TO_CHAR(DATE_TRUNC('month', started_at), 'YYYY-MM')
            ),
            cancelled AS (
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', cancelled_at), 'YYYY-MM') as month,
                    COUNT(*) as cancelled_subscriptions
                FROM stats.user_subscriptions
                WHERE status = 'cancelled' AND cancelled_at IS NOT NULL
                GROUP BY TO_CHAR(DATE_TRUNC('month', cancelled_at), 'YYYY-MM')
            )
            SELECT 
                m.month,
                COALESCE(ns.new_subscriptions, 0) as new_subscriptions,
                COALESCE(c.cancelled_subscriptions, 0) as cancelled_subscriptions,
                COALESCE(ns.new_subscriptions, 0) - COALESCE(c.cancelled_subscriptions, 0) as net_change
            FROM months m
            LEFT JOIN new_subs ns ON m.month = ns.month
            LEFT JOIN cancelled c ON m.month = c.month
            ORDER BY m.month DESC
        """
        
        rows = await conn.fetch(query, months)
        
        result = []
        cumulative = 0
        for row in reversed(list(rows)):
            cumulative += row['net_change']
            result.append(MonthlySubscriptionTrend(
                month=row['month'],
                new_subscriptions=row['new_subscriptions'],
                cancelled_subscriptions=row['cancelled_subscriptions'],
                net_change=row['net_change'],
                total_active_end_of_month=max(0, cumulative)
            ))
        
        return list(reversed(result))
    
    except Exception as e:
        logger.error(f"Error getting subscription trend: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/content/likes",
    response_model=List[ContentStats],
    dependencies=[Depends(admin_required)])
async def get_most_liked_content(
    limit: int = Query(10, ge=1, le=100),
    order_by: str = Query("likes", regex="^(likes|dislikes|net)$"),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Contenido con más likes/dislikes
    - Requiere rol admin
    - order_by: 'likes', 'dislikes', o 'net'
    """
    try:
        order_clause = {
            "likes": "likes DESC",
            "dislikes": "dislikes DESC",
            "net": "net_likes DESC"
        }[order_by]
        
        query = f"""
            SELECT 
                content_id,
                content_title,
                content_type,
                COUNT(*) FILTER (WHERE like_type = 'like') as likes,
                COUNT(*) FILTER (WHERE like_type = 'dislike') as dislikes,
                COUNT(*) FILTER (WHERE like_type = 'like') - COUNT(*) FILTER (WHERE like_type = 'dislike') as net_likes
            FROM stats.content_likes
            GROUP BY content_id, content_title, content_type
            ORDER BY {order_clause}
            LIMIT $1
        """
        
        rows = await conn.fetch(query, limit)
        
        result = []
        for row in rows:
            # Obtener stats de views
            views_query = """
                SELECT 
                    COUNT(*) as view_count,
                    COUNT(DISTINCT user_id) as unique_viewers,
                    ROUND(SUM(view_duration_seconds)::numeric / 3600, 2) as total_watch_time_hours,
                    ROUND(AVG(CASE WHEN completed THEN 1.0 ELSE 0.0 END)::numeric, 2) as average_completion_rate
                FROM stats.content_views
                WHERE content_id = $1
            """
            views_row = await conn.fetchrow(views_query, row['content_id'])
            
            result.append(ContentStats(
                content_id=row['content_id'],
                title=row['content_title'],
                view_count=views_row['view_count'] or 0,
                unique_viewers=views_row['unique_viewers'] or 0,
                total_watch_time_hours=float(views_row['total_watch_time_hours'] or 0),
                average_completion_rate=float(views_row['average_completion_rate'] or 0),
                likes=row['likes'],
                dislikes=row['dislikes'],
                net_likes=row['net_likes']
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting liked content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINTS DE USUARIO
# ==========================================

@router.post("/user/view", response_model=ViewResponse)
async def record_view(
    data: RecordViewRequest,
    auth_ctx: AuthContext = Depends(auth_required),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Registrar una visualización
    - Requiere autenticación
    """
    try:
        if data.user_id != auth_ctx.user_id:
            raise HTTPException(status_code=403, detail="Cannot record views for other users")
        
        query = """
            INSERT INTO stats.content_views 
            (user_id, content_id, content_type, view_duration_seconds, completed)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, content_id, content_type, view_duration_seconds as watch_duration_seconds, completed, viewed_at
        """
        
        row = await conn.fetchrow(
            query,
            data.user_id,
            data.content_id,
            data.content_type,
            data.watch_duration_seconds,
            data.completed
        )
        
        return ViewResponse(**dict(row))
    
    except Exception as e:
        logger.error(f"Error recording view: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user/like", response_model=LikeResponse)
async def record_like(
    data: RecordLikeRequest,
    auth_ctx: AuthContext = Depends(auth_required),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Registrar un like/dislike
    - Requiere autenticación
    """
    try:
        if data.user_id != auth_ctx.user_id:
            raise HTTPException(status_code=403, detail="Cannot record likes for other users")
        
        # Verificar si ya existe
        check_query = """
            SELECT id, like_type FROM stats.content_likes
            WHERE user_id = $1 AND content_id = $2
        """
        existing = await conn.fetchrow(check_query, data.user_id, data.content_id)
        
        if existing:
            # Actualizar
            update_query = """
                UPDATE stats.content_likes
                SET like_type = $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2 AND content_id = $3
                RETURNING id, user_id, content_id, like_type, created_at
            """
            row = await conn.fetchrow(update_query, data.like_type, data.user_id, data.content_id)
        else:
            # Insertar nuevo
            insert_query = """
                INSERT INTO stats.content_likes (user_id, content_id, like_type)
                VALUES ($1, $2, $3)
                RETURNING id, user_id, content_id, like_type, created_at
            """
            row = await conn.fetchrow(insert_query, data.user_id, data.content_id, data.like_type)
        
        return LikeResponse(**dict(row))
    
    except Exception as e:
        logger.error(f"Error recording like: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/history/views", response_model=List[UserViewHistory])
async def get_user_view_history(
    limit: int = Query(50, ge=1, le=200),
    auth_ctx: AuthContext = Depends(auth_required),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Obtener historial de visualizaciones del usuario
    - Requiere autenticación
    """
    try:
        query = """
            SELECT 
                content_id,
                content_type,
                content_title,
                view_duration_seconds as watch_duration_seconds,
                completed,
                viewed_at
            FROM stats.content_views
            WHERE user_id = $1
            ORDER BY viewed_at DESC
            LIMIT $2
        """
        
        rows = await conn.fetch(query, auth_ctx.user_id, limit)
        
        result = []
        for row in rows:
            result.append(UserViewHistory(
                content_id=row['content_id'],
                content_type=row['content_type'],
                title=row['content_title'],
                watch_duration_seconds=row['watch_duration_seconds'],
                completed=row['completed'],
                viewed_at=row['viewed_at']
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting view history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/history/likes", response_model=List[UserLikeHistory])
async def get_user_like_history(
    auth_ctx: AuthContext = Depends(auth_required),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Obtener historial de likes del usuario
    - Requiere autenticación
    """
    try:
        query = """
            SELECT 
                content_id,
                content_title,
                like_type,
                created_at
            FROM stats.content_likes
            WHERE user_id = $1
            ORDER BY created_at DESC
        """
        
        rows = await conn.fetch(query, auth_ctx.user_id)
        
        result = []
        for row in rows:
            result.append(UserLikeHistory(
                content_id=row['content_id'],
                like_type=row['like_type'],
                title=row['content_title'],
                created_at=row['created_at']
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting like history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/subscription", response_model=SubscriptionResponse)
async def get_user_subscription(
    auth_ctx: AuthContext = Depends(auth_required),
    conn: asyncpg.Connection = Depends(get_conn)
):
    """
    Obtener suscripción actual del usuario
    - Requiere autenticación
    """
    try:
        query = """
            SELECT 
                id, 
                user_id, 
                subscription_type, 
                started_at as start_date, 
                expires_at as end_date, 
                CASE WHEN status = 'active' THEN true ELSE false END as is_active,
                created_at
            FROM stats.user_subscriptions
            WHERE user_id = $1 AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 1
        """
        
        row = await conn.fetchrow(query, auth_ctx.user_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        return SubscriptionResponse(**dict(row))
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))