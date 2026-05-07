from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date

# ==========================================
# REQUEST MODELS
# ==========================================

class RecordViewRequest(BaseModel):
    """Registrar una visualización"""
    user_id: int = Field(..., description="ID del usuario")
    content_id: str = Field(..., description="ID del contenido en MongoDB")
    content_type: str = Field(..., description="movie o series")
    watch_duration_seconds: int = Field(..., ge=0, description="Duración vista en segundos")
    completed: bool = Field(default=False, description="Si completó el contenido")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 1,
                "content_id": "507f1f77bcf86cd799439011",
                "content_type": "movie",
                "watch_duration_seconds": 3600,
                "completed": True
            }
        }
    )

class RecordLikeRequest(BaseModel):
    """Registrar un like/dislike"""
    user_id: int = Field(..., description="ID del usuario")
    content_id: str = Field(..., description="ID del contenido")
    like_type: str = Field(..., description="like o dislike")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 1,
                "content_id": "507f1f77bcf86cd799439011",
                "like_type": "like"
            }
        }
    )

class CreateSubscriptionRequest(BaseModel):
    """Crear una suscripción"""
    user_id: int = Field(..., description="ID del usuario")
    subscription_type: str = Field(..., description="monthly o annual")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 1,
                "subscription_type": "monthly"
            }
        }
    )

class UpdateSubscriptionRequest(BaseModel):
    """Actualizar estado de suscripción"""
    is_active: Optional[bool] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_active": False
            }
        }
    )

# ==========================================
# RESPONSE MODELS
# ==========================================

class SubscriptionResponse(BaseModel):
    """Respuesta de suscripción"""
    id: int
    user_id: int
    subscription_type: str
    start_date: datetime
    end_date: datetime
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ViewResponse(BaseModel):
    """Respuesta de visualización"""
    id: int
    user_id: int
    content_id: str
    content_type: str
    watch_duration_seconds: int
    completed: bool
    viewed_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class LikeResponse(BaseModel):
    """Respuesta de like"""
    id: int
    user_id: int
    content_id: str
    like_type: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# STATISTICS RESPONSE MODELS
# ==========================================

class ContentStats(BaseModel):
    """Estadísticas de un contenido"""
    content_id: str
    title: Optional[str] = None
    view_count: int
    unique_viewers: int
    total_watch_time_hours: float
    average_completion_rate: float
    likes: int
    dislikes: int
    net_likes: int
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content_id": "507f1f77bcf86cd799439011",
                "title": "Avatar",
                "view_count": 1500,
                "unique_viewers": 800,
                "total_watch_time_hours": 2400.5,
                "average_completion_rate": 0.85,
                "likes": 950,
                "dislikes": 50,
                "net_likes": 900
            }
        }
    )

class GenreStats(BaseModel):
    """Estadísticas por género"""
    genre: str
    view_count: int
    unique_viewers: int
    percentage: float
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "genre": "Action",
                "view_count": 5000,
                "unique_viewers": 2000,
                "percentage": 35.5
            }
        }
    )

class DemographicStats(BaseModel):
    """Estadísticas demográficas"""
    category: str  # age_group o gender
    value: str     # "18-25" o "male"
    view_count: int
    unique_viewers: int
    percentage: float
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "category": "age_group",
                "value": "18-25",
                "view_count": 3000,
                "unique_viewers": 1200,
                "percentage": 40.0
            }
        }
    )

class SubscriptionStats(BaseModel):
    """Estadísticas de suscripciones"""
    total_subscribers: int
    active_subscribers: int
    monthly_subscribers: int
    annual_subscribers: int
    new_this_month: int
    churn_this_month: int
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_subscribers": 5000,
                "active_subscribers": 4500,
                "monthly_subscribers": 3000,
                "annual_subscribers": 1500,
                "new_this_month": 250,
                "churn_this_month": 50
            }
        }
    )

class MonthlySubscriptionTrend(BaseModel):
    """Tendencia mensual de suscripciones"""
    month: str  # YYYY-MM
    new_subscriptions: int
    cancelled_subscriptions: int
    net_change: int
    total_active_end_of_month: int
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "month": "2024-10",
                "new_subscriptions": 250,
                "cancelled_subscriptions": 50,
                "net_change": 200,
                "total_active_end_of_month": 4500
            }
        }
    )

class UserViewHistory(BaseModel):
    """Historial de vistas de un usuario"""
    content_id: str
    content_type: str
    title: Optional[str] = None
    watch_duration_seconds: int
    completed: bool
    viewed_at: datetime
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content_id": "507f1f77bcf86cd799439011",
                "content_type": "movie",
                "title": "Avatar",
                "watch_duration_seconds": 7200,
                "completed": True,
                "viewed_at": "2024-10-22T12:00:00Z"
            }
        }
    )

class UserLikeHistory(BaseModel):
    """Historial de likes de un usuario"""
    content_id: str
    like_type: str
    title: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content_id": "507f1f77bcf86cd799439011",
                "like_type": "like",
                "title": "Avatar",
                "created_at": "2024-10-22T12:00:00Z"
            }
        }
    )

# ==========================================
# STANDARD RESPONSES
# ==========================================

class MessageResponse(BaseModel):
    """Respuesta simple con mensaje"""
    message: str
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Operation completed successfully"
            }
        }
    )

class ErrorResponse(BaseModel):
    """Respuesta de error"""
    detail: str
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Resource not found"
            }
        }
    )