// app/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./components/AuthProvider";
import { Play, ChevronRight, Star, Globe, Smartphone, Tv, Monitor } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!loading && token) {
      router.push("/catalog");
    }
  }, [token, loading, router]);

  const handleGetStarted = () => {
    router.push("/login");
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Play className="w-6 h-6 fill-white" />
          </div>
          <p className="text-white">Cargando Chapinflix...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, they'll be redirected by useEffect
  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Chapinflix
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGetStarted}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Iniciar sesión
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background with overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            El cine guatemalteco
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              al alcance de todos
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto">
            Descubre películas nacionales e internacionales en una plataforma diseñada 
            para promover el talento guatemalteco. Streaming de calidad, bajo costo.
          </p>
          
          {/* Email signup */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 max-w-2xl mx-auto">
            <input
              type="email"
              placeholder="Ingresa tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:flex-1 px-4 py-3 rounded bg-black/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 px-8 py-3 rounded font-medium transition-colors flex items-center justify-center gap-2"
            >
              Comenzar
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-gray-400">
            ¿Listo para comenzar? Crea o inicia sesión en tu cuenta.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">¿Por qué elegir Chapinflix?</h2>
            <p className="text-xl text-gray-400">Una plataforma pensada para Guatemala</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Contenido Nacional</h3>
              <p className="text-gray-400">
                Apoya el cine guatemalteco con una selección curada de producciones locales
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Acceso Internacional</h3>
              <p className="text-gray-400">
                Disfruta también de películas internacionales cuidadosamente seleccionadas
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Streaming de Calidad</h3>
              <p className="text-gray-400">
                Tecnología de vanguardia para una experiencia de visualización superior
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Device Compatibility */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Ve en cualquier dispositivo</h2>
            <p className="text-xl text-gray-400">
              Chapinflix se adapta a tu estilo de vida
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Tv, label: "Smart TV" },
              { icon: Monitor, label: "Computadora" },
              { icon: Smartphone, label: "Móvil" },
              { icon: Smartphone, label: "Tablet" }
            ].map(({ icon: Icon, label }, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-gray-300">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-8">Precios accesibles para todos</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-4">Plan Gratuito</h3>
              <p className="text-4xl font-bold mb-4 text-blue-400">Q0<span className="text-lg text-gray-400">/mes</span></p>
              <ul className="text-left space-y-2 mb-8">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                  Contenido limitado
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                  Calidad estándar
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                  1 perfil
                </li>
              </ul>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded transition-colors"
              >
                Comenzar gratis
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-8 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-sm">
                Recomendado
              </div>
              <h3 className="text-2xl font-bold mb-4">Plan Premium</h3>
              <p className="text-4xl font-bold mb-4">Q29<span className="text-lg text-gray-200">/mes</span></p>
              <ul className="text-left space-y-2 mb-8">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Todo el contenido
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Calidad HD/4K
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Hasta 5 perfiles
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Descargas offline
                </li>
              </ul>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-white text-purple-600 hover:bg-gray-100 py-3 rounded font-medium transition-colors"
              >
                Prueba gratis 30 días
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            ¿Listo para descubrir el mejor entretenimiento guatemalteco?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Únete a miles de guatemaltecos que ya disfrutan de Chapinflix
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
          >
            Comenzar ahora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                <Play className="w-4 h-4 fill-white" />
              </div>
              <span className="text-xl font-bold">Chapinflix</span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Términos de uso</a>
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Soporte</a>
              <a href="#" className="hover:text-white transition-colors">Contacto</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
            <p>&copy; 2025 Chapinflix. Hecho con amor en Guatemala.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}