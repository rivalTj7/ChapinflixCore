import { useState, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/providers/ToastProvider';

interface Movie {
  movie_id: number;
  title: string;
  slug: string;
  is_free: boolean;
  duration_minutes: number | null;
  view_count: number | null;
  upload_date: string;
}

export function useFavorites() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch('https://34.10.139.168.nip.io/api/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const addToFavorites = useCallback(async (movie: Movie) => {
    if (!token) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Debes iniciar sesión para agregar favoritos'
      });
      return false;
    }

    try {
      const response = await fetch('https://34.10.139.168.nip.io/api/favorites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ movie_id: movie.movie_id })
      });

      if (response.ok) {
        setFavorites(prev => [...prev, movie]);
        showToast({
          type: 'success',
          title: 'Agregado a favoritos',
          message: `"${movie.title}" se agregó a tus favoritos`
        });
        return true;
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }

    showToast({
      type: 'error',
      title: 'Error',
      message: 'No se pudo agregar a favoritos'
    });
    return false;
  }, [token, showToast]);

  const removeFromFavorites = useCallback(async (movieId: number) => {
    if (!token) return false;

    try {
      const response = await fetch(`https://34.10.139.168.nip.io/api/favorites/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(movie => movie.movie_id !== movieId));
        showToast({
          type: 'info',
          title: 'Eliminado de favoritos',
          message: 'La película se eliminó de tus favoritos'
        });
        return true;
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }

    showToast({
      type: 'error',
      title: 'Error',
      message: 'No se pudo eliminar de favoritos'
    });
    return false;
  }, [token, showToast]);

  const isFavorite = useCallback((movieId: number) => {
    return favorites.some(movie => movie.movie_id === movieId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (movie: Movie) => {
    if (isFavorite(movie.movie_id)) {
      return await removeFromFavorites(movie.movie_id);
    } else {
      return await addToFavorites(movie);
    }
  }, [isFavorite, addToFavorites, removeFromFavorites]);

  return {
    favorites,
    loading,
    loadFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite
  };
}