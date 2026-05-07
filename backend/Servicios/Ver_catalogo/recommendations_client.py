import grpc
import os
from typing import List, Optional
from generated import recommendations_pb2, recommendations_pb2_grpc

class RecommendationsClient:
    '''
    Cliente gRPC para comunicarse con el servicio de recomendaciones
    '''
    
    def __init__(self, server_address: str = None):
        if server_address is None:
            # En Kubernetes: nombre del servicio
            server_address = os.getenv(
                "RECOMMENDATIONS_SERVICE_URL",
                "recommendations-service.default.svc.cluster.local:50051"
            )
        
        self.server_address = server_address
        self.channel = None
        self.stub = None
    
    def connect(self):
        '''Establece conexión con el servidor gRPC'''
        self.channel = grpc.insecure_channel(self.server_address)
        self.stub = recommendations_pb2_grpc.RecommendationsServiceStub(self.channel)
    
    def close(self):
        '''Cierra la conexión'''
        if self.channel:
            self.channel.close()
    
    def get_general_recommendations(
        self,
        limit: int = 10,
        exclude_ids: List[str] = None
    ) -> dict:
        '''
        Obtiene recomendaciones generales
        
        Returns:
            dict con 'recommendations' (list) y 'total' (int)
        '''
        if not self.stub:
            self.connect()
        
        try:
            request = recommendations_pb2.GeneralRecommendationsRequest(
                limit=limit,
                exclude_content_ids=exclude_ids or []
            )
            
            response = self.stub.GetGeneralRecommendations(request)
            
            return {
                "recommendations": [
                    {
                        "content_id": rec.content_id,
                        "title": rec.title,
                        "slug": rec.slug,
                        "synopsis_short": rec.synopsis_short,
                        "poster_url": rec.poster_url,
                        "classification_code": rec.classification_code,
                        "duration_minutes": rec.duration_minutes,
                        "is_free": rec.is_free,
                        "relevance_score": rec.relevance_score,
                        "reason": rec.reason,
                        "genres": list(rec.genres)
                    }
                    for rec in response.recommendations
                ],
                "total": response.total,
                "recommendation_type": response.recommendation_type
            }
        
        except grpc.RpcError as e:
            print(f"gRPC Error: {e.code()}: {e.details()}")
            return {"recommendations": [], "total": 0, "error": str(e)}
    
    def get_genre_based_recommendations(
        self,
        user_id: int,
        limit: int = 10,
        exclude_ids: List[str] = None
    ) -> dict:
        '''
        Obtiene recomendaciones basadas en géneros favoritos del usuario
        '''
        if not self.stub:
            self.connect()
        
        try:
            request = recommendations_pb2.UserRecommendationsRequest(
                user_id=user_id,
                limit=limit,
                exclude_content_ids=exclude_ids or []
            )
            
            response = self.stub.GetGenreBasedRecommendations(request)
            
            return {
                "recommendations": [
                    {
                        "content_id": rec.content_id,
                        "title": rec.title,
                        "slug": rec.slug,
                        "synopsis_short": rec.synopsis_short,
                        "poster_url": rec.poster_url,
                        "classification_code": rec.classification_code,
                        "duration_minutes": rec.duration_minutes,
                        "is_free": rec.is_free,
                        "relevance_score": rec.relevance_score,
                        "reason": rec.reason,
                        "genres": list(rec.genres)
                    }
                    for rec in response.recommendations
                ],
                "total": response.total,
                "recommendation_type": response.recommendation_type
            }
        
        except grpc.RpcError as e:
            print(f"gRPC Error: {e.code()}: {e.details()}")
            return {"recommendations": [], "total": 0, "error": str(e)}
    
    def get_collaborative_recommendations(
        self,
        user_id: int,
        limit: int = 10,
        exclude_ids: List[str] = None
    ) -> dict:
        '''
        Obtiene recomendaciones basadas en usuarios similares
        '''
        if not self.stub:
            self.connect()
        
        try:
            request = recommendations_pb2.UserRecommendationsRequest(
                user_id=user_id,
                limit=limit,
                exclude_content_ids=exclude_ids or []
            )
            
            response = self.stub.GetCollaborativeRecommendations(request)
            
            return {
                "recommendations": [
                    {
                        "content_id": rec.content_id,
                        "title": rec.title,
                        "slug": rec.slug,
                        "synopsis_short": rec.synopsis_short,
                        "poster_url": rec.poster_url,
                        "classification_code": rec.classification_code,
                        "duration_minutes": rec.duration_minutes,
                        "is_free": rec.is_free,
                        "relevance_score": rec.relevance_score,
                        "reason": rec.reason,
                        "genres": list(rec.genres)
                    }
                    for rec in response.recommendations
                ],
                "total": response.total,
                "recommendation_type": response.recommendation_type
            }
        
        except grpc.RpcError as e:
            print(f"gRPC Error: {e.code()}: {e.details()}")
            return {"recommendations": [], "total": 0, "error": str(e)}
    
    def health_check(self) -> dict:
        '''Verifica que el servicio esté saludable'''
        if not self.stub:
            self.connect()
        
        try:
            request = recommendations_pb2.Empty()
            response = self.stub.HealthCheck(request)
            
            return {
                "status": response.status,
                "service": response.service,
                "version": response.version
            }
        
        except grpc.RpcError as e:
            return {"status": "unhealthy", "error": str(e)}


# Instancia global del cliente (singleton)
_recommendations_client = None

def get_recommendations_client() -> RecommendationsClient:
    '''Obtiene instancia del cliente de recomendaciones'''
    global _recommendations_client
    if _recommendations_client is None:
        _recommendations_client = RecommendationsClient()
        _recommendations_client.connect()
    return _recommendations_client