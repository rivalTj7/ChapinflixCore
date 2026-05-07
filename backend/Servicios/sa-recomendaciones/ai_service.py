# ai_service.py
import os
import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from pydantic_settings import BaseSettings, SettingsConfigDict

class AISettings(BaseSettings):
    openai_api_key: str
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = AISettings()
client = AsyncOpenAI(api_key=settings.openai_api_key)

class AIService:
    """
    Servicio de IA para generar recomendaciones inteligentes
    """
    
    @staticmethod
    async def analyze_user_preferences(user_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analiza el historial de visualización de un usuario y extrae patrones
        
        Args:
            user_history: Lista de películas vistas con metadata
        
        Returns:
            Dict con géneros favoritos, temas, y preferencias
        """
        if not user_history:
            return {
                "favorite_genres": [],
                "themes": [],
                "preferences": "Usuario nuevo sin historial"
            }
        
        # Preparar prompt con el historial
        movies_summary = "\n".join([
            f"- {movie.get('title', 'Sin título')}: {movie.get('genre', 'Sin género')} - {movie.get('synopsis_short', 'Sin sinopsis')[:100]}"
            for movie in user_history[:10]  # Limitar a 10 para no exceder tokens
        ])
        
        prompt = f"""Analiza el siguiente historial de películas vistas por un usuario y extrae:
1. Sus géneros favoritos (ordenados por preferencia)
2. Temas recurrentes que le interesan
3. Un resumen breve de sus preferencias cinematográficas

Historial:
{movies_summary}

Responde en formato JSON:
{{
  "favorite_genres": ["género1", "género2", "género3"],
  "themes": ["tema1", "tema2"],
  "preferences": "descripción breve"
}}
"""
        
        try:
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Eres un experto analista de preferencias cinematográficas. Respondes siempre en JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            content = response.choices[0].message.content
            # Parsear JSON de la respuesta
            result = json.loads(content)
            return result
            
        except Exception as e:
            print(f"Error en análisis de IA: {e}")
            # Fallback: análisis simple sin IA
            genres = {}
            for movie in user_history:
                genre = movie.get('genre', '')
                if genre:
                    for g in genre.split(','):
                        g = g.strip()
                        genres[g] = genres.get(g, 0) + 1
            
            favorite_genres = sorted(genres.items(), key=lambda x: x[1], reverse=True)
            
            return {
                "favorite_genres": [g[0] for g in favorite_genres[:3]],
                "themes": [],
                "preferences": "Basado en análisis de géneros"
            }
    
    @staticmethod
    async def find_similar_content(
        target_movie: Dict[str, Any],
        candidate_movies: List[Dict[str, Any]],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Encuentra películas similares a una película objetivo usando IA
        
        Args:
            target_movie: Película de referencia
            candidate_movies: Lista de candidatos
            limit: Número de recomendaciones
        
        Returns:
            Lista de películas similares ordenadas por relevancia
        """
        if not candidate_movies:
            return []
        
        target_desc = f"{target_movie.get('title', '')}: {target_movie.get('synopsis_short', '')[:150]}"
        
        # Preparar candidatos (limitar para no exceder tokens)
        candidates_desc = "\n".join([
            f"{i}. {m.get('title', 'Sin título')}: {m.get('synopsis_short', 'Sin sinopsis')[:100]}"
            for i, m in enumerate(candidate_movies[:30], 1)
        ])
        
        prompt = f"""Dada esta película de referencia:
{target_desc}

Selecciona las {limit} películas más similares de esta lista (por temática, género, tono):
{candidates_desc}

Responde SOLO con los números de las películas seleccionadas, separados por comas (ejemplo: 1,5,12,3,7)
"""
        
        try:
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Eres un experto en cine que recomienda películas similares. Respondes SOLO con números separados por comas."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=100
            )
            
            content = response.choices[0].message.content.strip()
            # Parsear números
            indices = [int(x.strip()) - 1 for x in content.split(',') if x.strip().isdigit()]
            
            # Retornar películas seleccionadas
            selected = []
            for idx in indices[:limit]:
                if 0 <= idx < len(candidate_movies):
                    selected.append(candidate_movies[idx])
            
            return selected
            
        except Exception as e:
            print(f"Error en búsqueda de similares con IA: {e}")
            # Fallback: retornar los primeros N
            return candidate_movies[:limit]
    
    @staticmethod
    async def generate_recommendation_reason(
        movie: Dict[str, Any],
        user_preferences: Dict[str, Any]
    ) -> str:
        """
        Genera una razón personalizada de por qué recomendar esta película
        
        Args:
            movie: Película a recomendar
            user_preferences: Preferencias del usuario
        
        Returns:
            String con la razón
        """
        # Razones simples sin llamar a la API (para ahorrar tokens)
        genres = movie.get('genre', '').split(',')
        favorite_genres = user_preferences.get('favorite_genres', [])
        
        # Buscar coincidencias de género
        matching_genres = [g.strip() for g in genres if g.strip() in favorite_genres]
        
        if matching_genres:
            return f"Porque te gusta el género {matching_genres[0]}"
        
        if user_preferences.get('themes'):
            return f"Relacionado con tus intereses en {user_preferences['themes'][0]}"
        
        return "Basado en tu historial de visualización"
    
    @staticmethod
    async def explain_collaborative_recommendation(
        movie: Dict[str, Any],
        similar_users_count: int
    ) -> str:
        """
        Genera explicación para recomendación colaborativa
        """
        if similar_users_count == 1:
            return "Un usuario con gustos similares vio esta película"
        else:
            return f"{similar_users_count} usuarios con gustos similares vieron esta película"