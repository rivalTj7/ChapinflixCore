'use client';
import { useRouter } from 'next/navigation';
import { Play, Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-10 text-center max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 fill-white" />
          </div>
          <span className="text-2xl font-bold">Chapinflix</span>
        </div>

        {/* 404 Animation */}
        <div className="mb-8">
          <h1 className="text-8xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
            404
          </h1>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">Página no encontrada</h2>
          <p className="text-gray-400 leading-relaxed">
            La página que buscas no existe o ha sido movida. 
            Puede que el enlace esté roto o que hayas escrito mal la URL.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
          
          <button
            onClick={() => router.push('/catalog')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
            Ver catálogo
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-sm text-gray-500">
          <p>¿Necesitas ayuda? Visita nuestro catálogo de películas</p>
        </div>
      </div>
    </div>
  );
}