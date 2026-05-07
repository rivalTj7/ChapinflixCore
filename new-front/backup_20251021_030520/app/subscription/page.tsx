"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import Link from "next/link";
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Crown, 
  Star, 
  CreditCard,
  Shield,
  Zap,
  Download,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  Check,
  X
} from "lucide-react";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: string;
  };
}

interface SubscriptionStatus {
  has_active_subscription: boolean;
  subscription?: {
    id: string;
    status: string;
    current_period_end?: number;
  };
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [message, setMessage] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Hardcoded test user for sandbox
  const testEmail = "test@chapinflix.com";
  const testUsername = "testuser";

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchPrices();
    checkSubscriptionStatus();
  }, [token, router]);

  const fetchPrices = async () => {
    try {
      const response = await fetch("https://34.10.139.168.nip.io/pago/api/prices");
      const data = await response.json();
      setPrices(data.prices);
    } catch (error) {
      console.error("Error fetching prices:", error);
      setMessage("Error al cargar los planes de suscripción");
    }
  };

  const checkSubscriptionStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const response = await fetch("https://34.10.139.168.nip.io/pago/api/me/subscription", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      setSubscriptionStatus(data);
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSubscribe = async (priceId?: string) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("https://34.10.139.168.nip.io/pago/api/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: testUsername,
          email: testEmail,
          price_id: priceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await response.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error("Subscription error:", error);
      setMessage("Error al procesar la suscripción. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionStatus?.subscription?.id) return;

    setLoading(true);
    try {
      const response = await fetch("https://34.10.139.168.nip.io/pago/api/subscriptions/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subscription_id: subscriptionStatus.subscription.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      setMessage("Tu suscripción se cancelará al final del período de facturación actual");
      setTimeout(() => checkSubscriptionStatus(), 2000);
    } catch (error) {
      console.error("Cancel error:", error);
      setMessage("Error al cancelar la suscripción. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return (amount / 100).toFixed(2);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const premiumFeatures = [
    { icon: CheckCircle2, text: "Streaming ilimitado sin publicidad" },
    { icon: Star, text: "Acceso a todo el contenido premium" },
    { icon: Zap, text: "Calidad HD y 4K" },
    { icon: Download, text: "Descarga para ver sin conexión" },
    { icon: Users, text: "Hasta 5 perfiles diferentes" },
    { icon: Shield, text: "Cancelación en cualquier momento" }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/catalog" className="flex items-center space-x-2 group">
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-gray-400 group-hover:text-white transition-colors font-medium">
                Volver al catálogo
              </span>
            </Link>
            
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                <Play className="w-4 h-4 fill-white" />
              </div>
              <span className="text-xl font-bold">Chapinflix</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-600 to-orange-600 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Crown className="w-4 h-4" />
            <span>ChapinFlix Premium</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Desbloquea todo el contenido premium
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Disfruta de streaming ilimitado, contenido exclusivo y la mejor calidad de video sin interrupciones.
          </p>
        </div>

        {/* Current Subscription Status */}
        {isCheckingStatus ? (
          <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 mb-8 backdrop-blur-sm">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-3" />
              <span className="text-gray-300">Verificando estado de suscripción...</span>
            </div>
          </div>
        ) : subscriptionStatus?.has_active_subscription ? (
          <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-700/50 rounded-xl p-6 mb-8 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-bold text-white">Suscripción Activa</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-green-300">
                    Estado: <span className="font-medium capitalize">{subscriptionStatus.subscription?.status || "activo"}</span>
                  </p>
                  <p className="text-green-300">
                    Próxima facturación: <span className="font-medium">{formatDate(subscriptionStatus.subscription?.current_period_end)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelSubscription}
                disabled={loading || !subscriptionStatus.subscription?.id}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 hover:text-red-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                title={!subscriptionStatus.subscription?.id ? "ID de suscripción no disponible" : undefined}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </div>
                ) : (
                  "Cancelar suscripción"
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Subscription Plans */
          <div className="space-y-8">
            {/* Premium Features */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {premiumFeatures.map(({ icon: Icon, text }, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800/50 backdrop-blur-sm">
                  <Icon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span className="text-gray-200 text-sm">{text}</span>
                </div>
              ))}
            </div>

            {/* Default Plan Card */}
            <div className="relative">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 rounded-full text-sm font-medium text-white">
                  Más Popular
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-blue-500/50 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl" />
                
                <div className="relative z-10">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2 text-white">Premium Mensual</h3>
                    <div className="flex items-center justify-center space-x-1 mb-4">
                      <span className="text-4xl font-bold text-white">$9.99</span>
                      <span className="text-gray-400">/mes</span>
                    </div>
                    <p className="text-gray-300">Todo el contenido premium sin límites</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {[
                      "Streaming ilimitado sin anuncios",
                      "Acceso a todo el contenido premium",
                      "Calidad HD y 4K disponible",
                      "Sin contratos ni permanencias",
                      "Soporte prioritario 24/7"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-200">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe()}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Procesando...</span>
                      </div>
                    ) : (
                      "Suscribirse ahora"
                    )}
                  </button>

                  <p className="text-center text-sm text-gray-400 mt-4">
                    Cancela cuando quieras. Sin compromisos.
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Prices from Stripe */}
            {prices.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-center text-white">Otros planes disponibles</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {prices.map((price, index) => (
                    <div 
                      key={price.id} 
                      className="bg-gray-900/70 border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 transition-all backdrop-blur-sm"
                    >
                      <div className="text-center mb-6">
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          <span className="text-3xl font-bold text-white">
                            ${formatPrice(price.unit_amount)}
                          </span>
                          <span className="text-gray-400">/{price.recurring.interval}</span>
                        </div>
                        <p className="text-gray-400 capitalize">
                          Plan {price.recurring.interval === 'year' ? 'Anual' : 'Mensual'}
                        </p>
                        {price.recurring.interval === 'year' && (
                          <div className="inline-block bg-green-600/20 border border-green-600/50 text-green-400 px-2 py-1 rounded-full text-xs font-medium mt-2">
                            Ahorra 20%
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleSubscribe(price.id)}
                        disabled={loading}
                        className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Procesando..." : "Seleccionar plan"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Card Information */}
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-yellow-400 mb-3">Modo de prueba - Información para testing</h3>
                  <p className="text-yellow-200 mb-4">
                    Esta aplicación está en modo de prueba. Usa estos números de tarjeta para testing:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-yellow-100">Éxito: 4242 4242 4242 4242</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-yellow-100">Autenticación: 4000 0025 0000 3155</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <X className="w-4 h-4 text-red-400" />
                        <span className="text-yellow-100">Rechazada: 4000 0000 0000 9995</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-yellow-100">CVC: cualquier 3 dígitos</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-yellow-200/80 text-sm mt-4">
                    Usa cualquier fecha futura para la expiración.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg border backdrop-blur-sm ${
            message.includes('Error') || message.includes('error')
              ? 'bg-red-900/20 border-red-600/30 text-red-300'
              : 'bg-green-900/20 border-green-600/30 text-green-300'
          }`}>
            <div className="flex items-start space-x-2">
              {message.includes('Error') || message.includes('error') ? (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              )}
              <p>{message}</p>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 border-t border-gray-800/50 pt-12">
          <h3 className="text-2xl font-bold text-center mb-8 text-white">Preguntas frecuentes</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: "¿Puedo cancelar cuando quiera?",
                a: "Sí, puedes cancelar tu suscripción en cualquier momento sin penalizaciones. Mantendrás acceso hasta el final de tu período de facturación actual."
              },
              {
                q: "¿Qué incluye la suscripción premium?",
                a: "Acceso completo a todo nuestro catálogo, streaming sin anuncios, calidad HD/4K, descargas offline y hasta 5 perfiles de usuario."
              },
              {
                q: "¿Hay contenido gratuito disponible?",
                a: "Sí, ofrecemos una selección de contenido gratuito con anuncios. La suscripción premium elimina los anuncios y desbloquea todo el catálogo."
              },
              {
                q: "¿Cómo funciona la facturación?",
                a: "Se factura mensual o anualmente según el plan elegido. No hay compromisos a largo plazo y puedes cambiar de plan en cualquier momento."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-gray-900/50 rounded-lg p-6 border border-gray-800/50 backdrop-blur-sm">
                <h4 className="font-semibold mb-2 text-white">{faq.q}</h4>
                <p className="text-gray-300 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}