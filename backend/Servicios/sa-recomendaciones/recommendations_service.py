# recommendations_service.py - VERSIÓN SYNC
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId
from db_mongo import get_db

class RecommendationsService:
    """
    Servicio principal de lógica de recomendaciones (versión sync para gRPC)
    """
    
    @staticmethod
    def get_general_recommendations(
        limit: int = 10,
        exclude_ids: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Recomendaciones generales: películas más populares y recientes
        No requiere autenticación
        """
        db = get_db()
        exclude_ids = exclude_ids or []
        
        # Filtro de disponibilidad
        now = datetime.now(timezone.utc)
        filt = {
            "is_active": True,
            "$and": [
                {"$or": [{"available_from": None}, {"available_from": {"$lte": now}}]},
                {"$or": [{"available_until": None}, {"available_until": {"$gte": now}}]},
            ]
        }
        
        # Excluir IDs
        if exclude_ids:
            valid_oids = []
            for eid in exclude_ids:
                try:
                    valid_oids.append(ObjectId(eid))
                except:
                    pass
            if valid_oids:
                filt["_id"] = {"$nin": valid_oids}
        
        # Ordenar por popularidad y fecha
        cursor = db.movies.find(filt, projection={
            "_id": 1, "title": 1, "slug": 1, "synopsis_short": 1,
            "poster_url": 1, "classification_code": 1, "duration_minutes": 1,
            "is_free": 1, "stats": 1, "view_count": 1, "created_at": 1,
            "category_slugs": 1
        }).sort([
            ("stats.view_count", -1),
            ("view_count", -1),
            ("created_at", -1)
        ]).limit(limit)
        
        movies = list(cursor)
        
        # Calcular relevance_score basado en popularidad
        results = []
        for i, movie in enumerate(movies):
            view_count = movie.get("view_count", 0)
            relevance = 1.0 - (i * 0.05)  # Decrece ligeramente por posición
            relevance = max(0.5, min(1.0, relevance))
            
            results.append({
                "content_id": str(movie["_id"]),
                "title": movie.get("title", ""),
                "slug": movie.get("slug", ""),
                "synopsis_short": movie.get("synopsis_short"),
                "poster_url": movie.get("poster_url"),
                "classification_code": movie.get("classification_code"),
                "duration_minutes": movie.get("duration_minutes"),
                "is_free": bool(movie.get("is_free", False)),
                "relevance_score": relevance,
                "reason": "Popular en ChapinFlix",
                "genres": movie.get("category_slugs", [])
            })
        
        return results
    
    @staticmethod
    def get_genre_based_recommendations(
        user_id: int,
        limit: int = 10,
        exclude_ids: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Recomendaciones basadas en géneros favoritos del usuario
        """
        db = get_db()
        exclude_ids = exclude_ids or []
        
        # Obtener historial del usuario
        user_views = list(db.user_views.find(
            {"user_id": user_id}
        ).sort([("last_viewed", -1)]).limit(20))
        
        if not user_views:
            # Usuario sin historial: retornar recomendaciones generales
            return RecommendationsService.get_general_recommendations(limit, exclude_ids)
        
        # Obtener detalles de películas vistas
        viewed_movie_ids = [v["movie_id"] for v in user_views if isinstance(v.get("movie_id"), ObjectId)]
        viewed_movies = list(db.movies.find(
            {"_id": {"$in": viewed_movie_ids}},
            projection={"title": 1, "synopsis_short": 1, "category_slugs": 1}
        ))
        
        # Análisis simple de géneros favoritos (sin IA)
        genre_counts = {}
        for m in viewed_movies:
            for genre in m.get("category_slugs", []):
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
        
        favorite_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
        favorite_genres = [g[0] for g in favorite_genres[:3]]
        
        if not favorite_genres:
            return RecommendationsService.get_general_recommendations(limit, exclude_ids)
        
        # Buscar películas de esos géneros que no ha visto
        now = datetime.now(timezone.utc)
        filt = {
            "is_active": True,
            "$and": [
                {"$or": [{"available_from": None}, {"available_from": {"$lte": now}}]},
                {"$or": [{"available_until": None}, {"available_until": {"$gte": now}}]},
            ],
            "category_slugs": {"$in": favorite_genres},
            "_id": {"$nin": viewed_movie_ids}
        }
        
        # Excluir IDs adicionales
        if exclude_ids:
            valid_oids = []
            for eid in exclude_ids:
                try:
                    valid_oids.append(ObjectId(eid))
                except:
                    pass
            if valid_oids:
                if "_id" in filt:
                    filt["_id"]["$nin"].extend(valid_oids)
                else:
                    filt["_id"] = {"$nin": valid_oids}
        
        cursor = db.movies.find(filt, projection={
            "_id": 1, "title": 1, "slug": 1, "synopsis_short": 1,
            "poster_url": 1, "classification_code": 1, "duration_minutes": 1,
            "is_free": 1, "category_slugs": 1, "stats": 1
        }).sort([("stats.view_count", -1), ("created_at", -1)]).limit(limit)
        
        movies = list(cursor)
        
        results = []
        for i, movie in enumerate(movies):
            relevance = 1.0 - (i * 0.04)
            relevance = max(0.6, min(1.0, relevance))
            
            # Generar razón simple
            matching_genres = [g for g in movie.get("category_slugs", []) if g in favorite_genres]
            reason = f"Porque te gusta el género {matching_genres[0]}" if matching_genres else "Basado en tu historial"
            
            results.append({
                "content_id": str(movie["_id"]),
                "title": movie.get("title", ""),
                "slug": movie.get("slug", ""),
                "synopsis_short": movie.get("synopsis_short"),
                "poster_url": movie.get("poster_url"),
                "classification_code": movie.get("classification_code"),
                "duration_minutes": movie.get("duration_minutes"),
                "is_free": bool(movie.get("is_free", False)),
                "relevance_score": relevance,
                "reason": reason,
                "genres": movie.get("category_slugs", [])
            })
        
        return results
    
    @staticmethod
    def get_collaborative_recommendations(
        user_id: int,
        limit: int = 10,
        exclude_ids: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Recomendaciones basadas en usuarios con gustos similares
        Collaborative filtering básico
        """
        db = get_db()
        exclude_ids = exclude_ids or []
        
        # Obtener películas vistas por el usuario
        my_views = list(db.user_views.find(
            {"user_id": user_id}
        ).limit(100))
        
        if not my_views:
            return RecommendationsService.get_general_recommendations(limit, exclude_ids)
        
        my_movie_ids = set(str(v["movie_id"]) for v in my_views if isinstance(v.get("movie_id"), ObjectId))
        
        # Encontrar usuarios que han visto películas similares
        similar_users_views = list(db.user_views.find({
            "user_id": {"$ne": user_id},
            "movie_id": {"$in": [v["movie_id"] for v in my_views if isinstance(v.get("movie_id"), ObjectId)]}
        }).limit(500))
        
        # Contar coincidencias por usuario
        user_matches = {}
        for view in similar_users_views:
            uid = view["user_id"]
            user_matches[uid] = user_matches.get(uid, 0) + 1
        
        # Ordenar usuarios por similitud
        similar_users = sorted(user_matches.items(), key=lambda x: x[1], reverse=True)[:10]
        
        if not similar_users:
            return RecommendationsService.get_genre_based_recommendations(user_id, limit, exclude_ids)
        
        similar_user_ids = [u[0] for u in similar_users]
        
        # Obtener películas vistas por usuarios similares que yo NO he visto
        their_views = list(db.user_views.find({
            "user_id": {"$in": similar_user_ids}
        }).limit(1000))
        
        # Contar frecuencia de películas
        movie_freq = {}
        for view in their_views:
            mid = str(view.get("movie_id", ""))
            if mid and mid not in my_movie_ids:
                movie_freq[mid] = movie_freq.get(mid, 0) + 1
        
        # Ordenar por frecuencia
        recommended_movie_ids = sorted(movie_freq.items(), key=lambda x: x[1], reverse=True)
        top_movie_ids = [ObjectId(mid) for mid, _ in recommended_movie_ids[:limit * 2] if ObjectId.is_valid(mid)]
        
        # Obtener detalles de películas
        now = datetime.now(timezone.utc)
        filt = {
            "_id": {"$in": top_movie_ids},
            "is_active": True,
            "$and": [
                {"$or": [{"available_from": None}, {"available_from": {"$lte": now}}]},
                {"$or": [{"available_until": None}, {"available_until": {"$gte": now}}]},
            ]
        }
        
        movies = list(db.movies.find(filt, projection={
            "_id": 1, "title": 1, "slug": 1, "synopsis_short": 1,
            "poster_url": 1, "classification_code": 1, "duration_minutes": 1,
            "is_free": 1, "category_slugs": 1
        }).limit(limit))
        
        results = []
        for i, movie in enumerate(movies):
            mid = str(movie["_id"])
            similar_count = movie_freq.get(mid, 0)
            relevance = min(1.0, 0.7 + (similar_count * 0.05))
            
            if similar_count == 1:
                reason = "Un usuario con gustos similares vio esta película"
            else:
                reason = f"{similar_count} usuarios con gustos similares vieron esto"
            
            results.append({
                "content_id": str(movie["_id"]),
                "title": movie.get("title", ""),
                "slug": movie.get("slug", ""),
                "synopsis_short": movie.get("synopsis_short"),
                "poster_url": movie.get("poster_url"),
                "classification_code": movie.get("classification_code"),
                "duration_minutes": movie.get("duration_minutes"),
                "is_free": bool(movie.get("is_free", False)),
                "relevance_score": relevance,
                "reason": reason,
                "genres": movie.get("category_slugs", [])
            })
        
        return results