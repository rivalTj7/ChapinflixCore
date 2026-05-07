import { useState } from 'react';
import Link from 'next/link';
import { Play, Clock, Eye, Heart, Crown } from 'lucide-react';
import { useFavorites } from '../../hooks/useFavorites';
import { Button } from './Button';

interface Movie {
  movie_id: number;
  title: string;
  slug: string;
  is_free: boolean;
  duration_minutes: number | null;
  view_count: number | null;
  upload_date: string;
}

interface MovieCardProps {
  movie: Movie;
  viewMode?: 'grid' | 'list';
}

export function MovieCard({ movie, viewMode = 'grid' }: MovieCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isHovered, setIsHovered] = useState(false);

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes || minutes === 0) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatViews = (count: number | null | undefined) => {
    if (!count || count === 0) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (viewMode === 'list') {
    return (
      <div className="flex items-center space-x-4 bg-gray-900/50 rounded-xl p-4 hover:bg-gray-800/50 transition-all duration-200 group">
        {/* Thumbnail */}
        <div className="w-20 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded flex items-center justify-center flex-shrink-0">
          <Play className="w-4 h-4 text-gray-500" />
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold mb-1 group-hover:text-blue-400 transition-colors">
                {movie.title}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(movie.duration_minutes)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-3 h-3" />
                  <span>{formatViews(movie.view_count)}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  movie.is_free 
                    ? "bg-green-900/50 text-green-400" 
                    : "bg-yellow-900/50 text-yellow-400"
                }`}>
                  {movie.is_free ? "Gratis" : "Premium"}
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFavorite(movie)}
                icon={<Heart className={`w-4 h-4 ${isFavorite(movie.movie_id) ? 'fill-red-500 text-red-500' : ''}`} />}
              />
              <Link href={`/watch/${movie.slug}`}>
                <Button size="sm" icon={<Play className="w-4 h-4" />}>
                  Ver
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group bg-gray-900/50 rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Movie Poster */}
      <div className="relative aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
        <Play className="w-8 h-8 text-gray-500" />
        
        {/* Hover Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-fadeIn">
            <Link href={`/watch/${movie.slug}`}>
              <Button
                size="lg"
                className="rounded-full"
                icon={<Play className="w-6 h-6 fill-current" />}
              />
            </Link>
          </div>
        )}

        {/* Premium Badge */}
        {!movie.is_free && (
          <div className="absolute top-2 right-2">
            <div className="bg-yellow-500 rounded-full p-1">
              <Crown className="w-3 h-3 text-white" />
            </div>
          </div>
        )}

        {/* Favorite Button */}
        <div className="absolute top-2 left-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full bg-black/50 hover:bg-black/70"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(movie);
            }}
            icon={
              <Heart 
                className={`w-4 h-4 ${
                  isFavorite(movie.movie_id) 
                    ? 'fill-red-500 text-red-500' 
                    : 'text-white'
                }`} 
              />
            }
          />
        </div>
      </div>
      
      {/* Movie Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            movie.is_free 
              ? "bg-green-900/50 text-green-400 border border-green-800" 
              : "bg-yellow-900/50 text-yellow-400 border border-yellow-800"
          }`}>
            {movie.is_free ? "Gratis" : "Premium"}
          </span>
        </div>
        
        <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
          {movie.title}
        </h3>
        
        <div className="space-y-1 text-sm text-gray-400 mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(movie.duration_minutes)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Eye className="w-3 h-3" />
            <span>{formatViews(movie.view_count)} vistas</span>
          </div>
        </div>
        
        <Link href={`/watch/${movie.slug}`}>
          <Button
            className="w-full"
            icon={<Play className="w-4 h-4" />}
          >
            Ver ahora
          </Button>
        </Link>
      </div>
    </div>
  );
}