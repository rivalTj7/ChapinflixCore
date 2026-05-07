'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Error Icon */}
        <div className="w-16 h-16 bg-red-900/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold mb-4">¡Ups! Algo salió mal</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado 
          y estamos trabajando para solucionarlo.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Intentar nuevamente
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}