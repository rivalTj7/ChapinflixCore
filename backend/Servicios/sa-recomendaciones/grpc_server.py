# grpc_server.py - VERSIÓN SYNC (sin asyncio)
import grpc
from concurrent import futures
import asyncio
from typing import List

from generated import recommendations_pb2, recommendations_pb2_grpc
from recommendations_service import RecommendationsService

class RecommendationsServicer(recommendations_pb2_grpc.RecommendationsServiceServicer):
    """
    Implementación del servidor gRPC de recomendaciones
    """
    
    def GetGeneralRecommendations(self, request, context):
        """
        Recomendaciones generales (sin autenticación)
        """
        try:
            # Ahora es sync, no necesita asyncio
            recommendations = RecommendationsService.get_general_recommendations(
                limit=request.limit if request.limit > 0 else 10,
                exclude_ids=list(request.exclude_content_ids) if request.exclude_content_ids else []
            )
            
            return self._build_response(recommendations, "general")
            
        except Exception as e:
            print(f"Error in GetGeneralRecommendations: {e}")
            import traceback
            traceback.print_exc()
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Error getting general recommendations: {str(e)}")
            return recommendations_pb2.RecommendationsResponse()
    
    def GetGenreBasedRecommendations(self, request, context):
        """
        Recomendaciones por género favorito
        """
        if request.user_id <= 0:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("user_id is required and must be > 0")
            return recommendations_pb2.RecommendationsResponse()
        
        try:
            recommendations = RecommendationsService.get_genre_based_recommendations(
                user_id=request.user_id,
                limit=request.limit if request.limit > 0 else 10,
                exclude_ids=list(request.exclude_content_ids) if request.exclude_content_ids else []
            )
            
            return self._build_response(recommendations, "genre_based")
            
        except Exception as e:
            print(f"Error in GetGenreBasedRecommendations: {e}")
            import traceback
            traceback.print_exc()
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Error getting genre-based recommendations: {str(e)}")
            return recommendations_pb2.RecommendationsResponse()
    
    def GetCollaborativeRecommendations(self, request, context):
        """
        Recomendaciones por similitud de usuarios
        """
        if request.user_id <= 0:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("user_id is required and must be > 0")
            return recommendations_pb2.RecommendationsResponse()
        
        try:
            recommendations = RecommendationsService.get_collaborative_recommendations(
                user_id=request.user_id,
                limit=request.limit if request.limit > 0 else 10,
                exclude_ids=list(request.exclude_content_ids) if request.exclude_content_ids else []
            )
            
            return self._build_response(recommendations, "collaborative")
            
        except Exception as e:
            print(f"Error in GetCollaborativeRecommendations: {e}")
            import traceback
            traceback.print_exc()
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Error getting collaborative recommendations: {str(e)}")
            return recommendations_pb2.RecommendationsResponse()
    
    def HealthCheck(self, request, context):
        """
        Health check del servicio
        """
        return recommendations_pb2.HealthResponse(
            status="healthy",
            service="recommendations",
            version="1.0.0"
        )
    
    @staticmethod
    def _build_response(recommendations: List[dict], rec_type: str) -> recommendations_pb2.RecommendationsResponse:
        """
        Convierte lista de recomendaciones a protobuf response
        """
        pb_recommendations = []
        
        for rec in recommendations:
            pb_rec = recommendations_pb2.MovieRecommendation(
                content_id=rec.get("content_id", ""),
                title=rec.get("title", ""),
                slug=rec.get("slug", ""),
                synopsis_short=rec.get("synopsis_short") or "",
                poster_url=rec.get("poster_url") or "",
                classification_code=rec.get("classification_code") or "",
                duration_minutes=rec.get("duration_minutes", 0),
                is_free=rec.get("is_free", False),
                relevance_score=rec.get("relevance_score", 0.5),
                reason=rec.get("reason", ""),
                genres=rec.get("genres", [])
            )
            pb_recommendations.append(pb_rec)
        
        return recommendations_pb2.RecommendationsResponse(
            recommendations=pb_recommendations,
            total=len(pb_recommendations),
            recommendation_type=rec_type
        )


async def serve_grpc(port: int = 50051):
    """
    Inicia el servidor gRPC
    """
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    recommendations_pb2_grpc.add_RecommendationsServiceServicer_to_server(
        RecommendationsServicer(), server
    )
    
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    
    print(f"🚀 Servidor gRPC de Recomendaciones corriendo en puerto {port}")
    
    try:
        await asyncio.Event().wait()  # Run forever
    except KeyboardInterrupt:
        server.stop(0)
        print("\n✋ Servidor gRPC detenido")