// app/verify-email/page.tsx
"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, CheckCircle, XCircle, Mail, ArrowLeft, RefreshCw } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'manual'>('loading');
  const [message, setMessage] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const API_BASE = "http://34.135.146.173.nip.io";

  const verifyEmail = async (token: string) => {
    try {
      setIsVerifying(true);
      const res = await fetch(`${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
        method: "GET",
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || "Email verificado exitosamente");
      } else {
        setStatus('error');
        setMessage(data.detail || data.message || "Error al verificar el email");
      }
    } catch (err) {
      setStatus('error');
      setMessage("Error de conexión. Intenta nuevamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const token = searchParams?.get('token');
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('manual');
    }
  }, [searchParams]);

  const handleManualVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      verifyEmail(manualToken.trim());
    }
  };

  const goToLogin = () => {
    router.push('/login');
  };

  const goBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={goBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Inicio</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <span className="text-xl font-bold">Chapinflix</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-0">
        <div className="w-full max-w-md">
          <div className="bg-black/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
            
            {/* Loading State */}
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
                <h1 className="text-2xl font-bold mb-4">Verificando tu email...</h1>
                <p className="text-gray-400">
                  Por favor espera mientras verificamos tu dirección de correo electrónico.
                </p>
              </>
            )}

            {/* Success State */}
            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-900/20 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold mb-4 text-green-400">¡Email verificado!</h1>
                <p className="text-gray-300 mb-6">{message}</p>
                <p className="text-gray-400 mb-8">
                  Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesión y disfrutar de todo el contenido de Chapinflix.
                </p>
                <button
                  onClick={goToLogin}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all duration-200"
                >
                  Iniciar sesión
                </button>
              </>
            )}

            {/* Error State */}
            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-900/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold mb-4 text-red-400">Error de verificación</h1>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Si el link ha expirado, puedes ingresar manualmente el código que recibiste por email:
                  </p>
                  <form onSubmit={handleManualVerification}>
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Ingresa tu código de verificación"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all mb-4"
                    />
                    <button
                      type="submit"
                      disabled={isVerifying || !manualToken.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verificando...</span>
                        </>
                      ) : (
                        <span>Verificar email</span>
                      )}
                    </button>
                  </form>
                  <button
                    onClick={goToLogin}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition-colors"
                  >
                    Volver al login
                  </button>
                </div>
              </>
            )}

            {/* Manual Input State */}
            {status === 'manual' && (
              <>
                <div className="w-16 h-16 bg-blue-900/20 border-2 border-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-blue-500" />
                </div>
                <h1 className="text-2xl font-bold mb-4">Verificar tu email</h1>
                <p className="text-gray-400 mb-8">
                  Ingresa el código de verificación que recibiste en tu correo electrónico.
                </p>
                
                <form onSubmit={handleManualVerification} className="space-y-6">
                  <div>
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Código de verificación"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isVerifying || !manualToken.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <span>Verificar email</span>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500">
                    ¿No recibiste el email?{" "}
                    <button
                      onClick={goToLogin}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Regístrate nuevamente
                    </button>
                  </p>
                </div>
              </>
            )}

            {/* Help Text */}
            <div className="mt-8 text-xs text-gray-500 space-y-1">
              <p>¿Problemas con la verificación?</p>
              <p>Revisa tu carpeta de spam o correos no deseados.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Play className="w-6 h-6 fill-white" />
          </div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}