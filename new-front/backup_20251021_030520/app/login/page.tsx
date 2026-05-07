// app/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import { Play, ArrowLeft, Eye, EyeOff, User, Mail, Lock, AlertCircle } from "lucide-react";

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

export default function Login() {
  const router = useRouter();
  const { setToken } = useAuth();
  
  // Login state
  const [username, setUsername] = useState("beto");
  const [password, setPassword] = useState("beto2025");
  
  // Register state
  const [registerData, setRegisterData] = useState<RegisterData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });
  
  // UI state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const API_BASE = "http://34.135.146.173.nip.io";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || data.message || "Credenciales incorrectas");
        return;
      }

      setToken(data.access_token);
      setSuccess("¡Inicio de sesión exitoso! Redirigiendo...");
      setTimeout(() => router.push("/catalog"), 1000);
    } catch (err) {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validaciones
    if (registerData.password !== registerData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (registerData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (!registerData.email.includes("@")) {
      setError("Por favor ingresa un email válido");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerData.email,
          username: registerData.username,
          password: registerData.password,
          first_name: registerData.firstName,
          last_name: registerData.lastName
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle validation errors from the API
        if (data.detail && Array.isArray(data.detail)) {
          const errorMessages = data.detail.map((err: any) => err.msg).join(", ");
          setError(errorMessages);
        } else {
          setError(data.message || "Error al crear la cuenta");
        }
        return;
      }

      setSuccess("¡Cuenta creada exitosamente! Te hemos enviado un email de verificación.");
      // Redirect to verification page after a short delay
      setTimeout(() => {
        router.push('/verify-email');
      }, 2000);
      setRegisterData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: ""
      });
    } catch (err) {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.push("/");
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setSuccess("");
  };

  const handleRegisterChange = (field: keyof RegisterData, value: string) => {
    setRegisterData(prev => ({
      ...prev,
      [field]: value
    }));
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
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={goBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
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
          <div className="bg-black/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">
                {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
              </h1>
              <p className="text-gray-400">
                {isSignUp 
                  ? "Únete a la comunidad de Chapinflix" 
                  : "Bienvenido de vuelta a Chapinflix"
                }
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 bg-green-900/20 border border-green-800 rounded-lg p-3">
                <p className="text-green-400 text-sm text-center">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Login Form */}
            {!isSignUp ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Usuario
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Ingresa tu usuario"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <span>Iniciar sesión</span>
                  )}
                </button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={registerData.firstName}
                      onChange={(e) => handleRegisterChange("firstName", e.target.value)}
                      className="w-full px-3 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={registerData.lastName}
                      onChange={(e) => handleRegisterChange("lastName", e.target.value)}
                      className="w-full px-3 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Apellido"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={registerData.email}
                      onChange={(e) => handleRegisterChange("email", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre de usuario
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={registerData.username}
                      onChange={(e) => handleRegisterChange("username", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Elige un nombre de usuario"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={registerData.password}
                      onChange={(e) => handleRegisterChange("password", e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Crea una contraseña segura"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={registerData.confirmPassword}
                      onChange={(e) => handleRegisterChange("confirmPassword", e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Confirma tu contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Creando cuenta...</span>
                    </>
                  ) : (
                    <span>Crear cuenta</span>
                  )}
                </button>
              </form>
            )}

            {/* Toggle Sign Up/Login */}
            <div className="mt-8 text-center">
              <p className="text-gray-400">
                {isSignUp ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="ml-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  {isSignUp ? "Inicia sesión" : "Regístrate"}
                </button>
              </p>
            </div>

            {/* Terms */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Al continuar, aceptas nuestros{" "}
                <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Términos de Servicio
                </a>{" "}
                y{" "}
                <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Política de Privacidad
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}