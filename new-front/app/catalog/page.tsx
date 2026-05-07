"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import Link from "next/link";
import { 
  Play, 
  Search, 
  Filter, 
  Clock, 
  Eye, 
  Star, 
  Crown, 
  Upload, 
  Settings, 
  LogOut,
  ChevronDown,
  Grid,
  List,
  Heart,
  CreditCard,
  User,
  Home,
  TrendingUp,
  Plus,
  X,
  Shield
} from "lucide-react";

interface Movie {
  movie_id: string;
  title: string;
  slug: string;
  synopsis_short: string;
  poster_url: string;
  classification_code: string;
  duration_minutes: number;
  is_free: boolean;
  view_count: number;
  upload_date: string;
  last_viewed?: string;
  watch_count?: number;
}

interface FeaturedMovie {
  movie_id: string;
  title: string;
  slug: string;
  synopsis_short: string;
  synopsis_long: string;
  banner_url: string;
  poster_url: string;
  classification_code: string;
  duration_minutes: number;
  is_free: boolean;
}

interface Category {
  category_id: string;
  name: string;
  slug: string;
  parent_id?: string;
}

interface MoviesResponse {
  items: Movie[];
  total: number;
}

interface UserProfile {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_verified: boolean;
  two_fa_enabled: boolean;
  created_at: string;
  // Información adicional de roles que se obtendrá del endpoint de usuarios
  is_admin?: boolean;
  is_content_handler?: boolean;
  is_paid?: boolean;
}

interface UserDetailFromAdmin {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_verified: boolean;
  is_paid: boolean;
  is_admin: boolean;
  is_content_handler: boolean;
  two_fa_enabled: boolean;
  created_at: string;
}

export default function Catalog() {
  const router = useRouter();
  const { token, setToken } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<FeaturedMovie | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Estado para el perfil del usuario y edición
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: ""
  });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadCategories();
    loadMovies("popular");
    loadUserProfile(); // Cargar perfil del usuario
  }, [token, router]);

  const loadUserProfile = async () => {
    if (!token) return;
    
    setProfileLoading(true);
    try {
      // Primero obtener info básica del usuario
      const authResponse = await fetch("http://34.135.146.173.nip.io/auth/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (authResponse.ok) {
        const authProfile = await authResponse.json();
        
        try {
          // Intentar obtener información completa (incluyendo roles) del endpoint de usuarios
          const userDetailResponse = await fetch(`http://34.135.146.173.nip.io/usuarios/users/${authProfile.id}/detail`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });

          if (userDetailResponse.ok) {
            const userDetail: UserDetailFromAdmin = await userDetailResponse.json();
            // Combinar información básica con roles
            setUserProfile({
              ...authProfile,
              is_admin: userDetail.is_admin,
              is_content_handler: userDetail.is_content_handler,
              is_paid: userDetail.is_paid
            });
          } else {
            // Si no se puede obtener info de roles, usar solo info básica
            setUserProfile({
              ...authProfile,
              is_admin: false,
              is_content_handler: false,
              is_paid: false
            });
          }
        } catch (roleError) {
          console.warn("No se pudieron cargar los roles del usuario:", roleError);
          setUserProfile({
            ...authProfile,
            is_admin: false,
            is_content_handler: false,
            is_paid: false
          });
        }

        // Inicializar formulario de edición
        setEditFormData({
          first_name: authProfile.first_name,
          last_name: authProfile.last_name,
          email: authProfile.email
        });
      } else {
        console.warn("No se pudo cargar el perfil del usuario");
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleEditProfile = async () => {
    if (!userProfile) return;
    
    setEditLoading(true);
    try {
      // Aquí necesitarías un endpoint para actualizar el perfil
      // Por ejemplo: PUT /auth/api/auth/profile
      const response = await fetch("http://34.135.146.173.nip.io/auth/api/auth/profile", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        // Recargar el perfil después de actualizar
        await loadUserProfile();
        setShowEditProfile(false);
      } else {
        console.error("Error al actualizar perfil");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setEditLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch("http://34.135.146.173.nip.io/vercatalogo/catalog/categories");
      const data = await res.json();
      setCategories(data || []);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const loadMovies = async (type: string) => {
    setLoading(true);
    setActiveTab(type);
    let url = "http://34.135.146.173.nip.io/vercatalogo/catalog/";

    switch (type) {
      case "popular":
        url += "most-popular?limit=20";
        break;
      case "top15":
        url += "top-15";
        break;
      case "recent":
        url += "recently-added?limit=20";
        break;
      case "watched":
        url += "recently-watched?limit=20";
        break;
      default:
        url += "most-popular?limit=20";
    }

    const headers: Record<string, string> = {};
    if (type === "watched" && token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { headers });
      const data = await res.json();
      setMovies(data.items || []);
    } catch (err) {
      console.error("Error loading movies:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadByCategory = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      const res = await fetch(`http://34.135.146.173.nip.io/vercatalogo/catalog/category/${selectedCategory}?limit=20&offset=0`);
      const data: MoviesResponse = await res.json();
      setMovies(data.items || []);
    } catch (err) {
      console.error("Error loading category:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    router.push("/");
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes === 0) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatViews = (count: number) => {
    if (!count || count === 0) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { key: "popular", label: "Más populares", icon: TrendingUp },
    { key: "top15", label: "Top 15", icon: Crown },
    { key: "recent", label: "Recién agregadas", icon: Plus },
    { key: "watched", label: "Visto recientemente", icon: Eye },
    { key: "watch-again", label: "Ver otra vez", icon: Clock }
  ];

  // Función para verificar si el usuario es admin
  const isAdmin = userProfile?.is_admin || false;
  const isContentHandler = userProfile?.is_content_handler || false;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Unificado */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo y Navegación */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-white" />
                </div>
                <span className="text-xl font-bold text-white">Chapinflix</span>
              </Link>
              
              <nav className="hidden md:flex items-center space-x-6">
                <Link 
                  href="/catalog" 
                  className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors font-medium"
                >
                  <Home className="w-4 h-4" />
                  <span>Inicio</span>
                </Link>
              </nav>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar películas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all backdrop-blur-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-all backdrop-blur-sm"
                title={viewMode === 'grid' ? 'Vista de lista' : 'Vista de cuadrícula'}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </button>

              {/* User Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-white transition-all backdrop-blur-sm"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    
                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-gray-800/95 backdrop-blur-md border border-gray-600/50 rounded-lg shadow-xl z-50">
                      <div className="py-2">
                        {/* User Info */}
                        {userProfile && (
                          <div className="px-4 py-3 border-b border-gray-600/50">
                            <div className="text-sm font-medium text-white">
                              {userProfile.first_name} {userProfile.last_name}
                            </div>
                            <div className="text-xs text-gray-400">@{userProfile.username}</div>
                            <div className="flex items-center space-x-2 mt-1">
                              {userProfile.is_admin && (
                                <span className="px-1.5 py-0.5 bg-red-600/20 text-red-400 text-xs rounded border border-red-600/50">Admin</span>
                              )}
                              {userProfile.is_content_handler && (
                                <span className="px-1.5 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded border border-purple-600/50">Content</span>
                              )}
                              {userProfile.is_paid && (
                                <span className="px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs rounded border border-yellow-600/50">Premium</span>
                              )}
                            </div>
                            {/* Botón para editar perfil */}
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                setShowEditProfile(true);
                              }}
                              className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Editar perfil
                            </button>
                          </div>
                        )}
                        
                        <Link
                          href="/subscription"
                          className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 text-blue-400 hover:text-blue-300 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Premium</span>
                        </Link>
                        
                        <div className="border-t border-gray-600/50 my-2" />
                        
                        {/* Upload - Solo mostrar si es admin */}
                        {isAdmin && (
                          <Link
                            href="/upload"
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 text-gray-200 hover:text-white transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Upload className="w-4 h-4" />
                            <span>Subir película</span>
                          </Link>
                        )}
                        
                        {/* Panel Admin - Solo mostrar si es admin */}
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 text-orange-400 hover:text-orange-300 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Shield className="w-4 h-4" />
                            <span>Panel admin</span>
                          </Link>
                        )}
                        
                        <div className="border-t border-gray-600/50 my-2" />
                        
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleLogout();
                          }}
                          className="flex items-center space-x-3 w-full px-4 py-3 hover:bg-gray-700/50 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Cerrar sesión</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Featured Movie Banner */}
        {featuredMovie && (
          <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800">
            {/* Background Image */}
            {featuredMovie.banner_url && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${featuredMovie.banner_url})` }}
              />
            )}
            
            {/* Content */}
            <div className="relative z-10 p-8 md:p-12">
              <div className="max-w-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full">
                    Destacada
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    featuredMovie.is_free 
                      ? "bg-green-600/20 text-green-400 border border-green-600/50" 
                      : "bg-yellow-600/20 text-yellow-400 border border-yellow-600/50"
                  }`}>
                    {featuredMovie.is_free ? "Gratis" : "Premium"}
                  </span>
                  {featuredMovie.classification_code && (
                    <span className="px-3 py-1 bg-gray-600/50 text-gray-200 text-sm font-medium rounded-full">
                      {featuredMovie.classification_code}
                    </span>
                  )}
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                  {featuredMovie.title}
                </h2>
                
                <p className="text-lg text-gray-300 mb-6 line-clamp-3">
                  {featuredMovie.synopsis_long || featuredMovie.synopsis_short}
                </p>
                
                <div className="flex items-center space-x-6 mb-6">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(featuredMovie.duration_minutes)}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Link
                    href={`/watch/${featuredMovie.slug}`}
                    className="flex items-center space-x-2 bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    <span>Ver ahora</span>
                  </Link>
                  
                  <button className="flex items-center space-x-2 bg-gray-800/80 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700/80 transition-colors backdrop-blur-sm">
                    <Plus className="w-5 h-5" />
                    <span>Mi lista</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => loadMovies(key)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
                activeTab === key 
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25" 
                  : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-200 hover:text-white border border-gray-700/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-gray-900/50 rounded-xl border border-gray-800/50 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Filtrar por categoría:</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadByCategory}
              disabled={!selectedCategory}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors font-medium"
            >
              Filtrar
            </button>
            {selectedCategory && (
              <button
                onClick={() => {
                  setSelectedCategory("");
                  loadMovies(activeTab);
                }}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white rounded-lg text-sm transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Movies Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Play className="w-8 h-8 fill-white" />
              </div>
              <p className="text-lg text-gray-300">Cargando películas...</p>
            </div>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-2xl font-medium mb-3 text-white">No se encontraron películas</h3>
            <p className="text-gray-400 text-lg">
              {searchQuery ? `No hay resultados para "${searchQuery}"` : "No hay películas disponibles en esta categoría"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" 
              : "space-y-4"
          }>
            {filteredMovies.map(movie => (
              <div 
                key={movie.movie_id} 
                className={
                  viewMode === 'grid'
                    ? "group bg-gray-900/80 rounded-xl overflow-hidden hover:bg-gray-800/80 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-black/50 backdrop-blur-sm"
                    : "flex items-center space-x-4 bg-gray-900/80 rounded-xl p-4 hover:bg-gray-800/80 border border-gray-700/50 hover:border-gray-600/50 transition-all backdrop-blur-sm"
                }
              >
                {viewMode === 'grid' ? (
                  <>
                    {/* Movie Poster */}
                    <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                      {movie.poster_url ? (
                        <img 
                          src={movie.poster_url} 
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Play className="w-12 h-12 text-gray-400 group-hover:text-white transition-colors" />
                      )}
                      
                      {/* Badge y Favorito */}
                      <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium shadow-lg ${
                          movie.is_free 
                            ? "bg-green-600/90 text-white" 
                            : "bg-yellow-600/90 text-white"
                        }`}>
                          {movie.is_free ? "Gratis" : "Premium"}
                        </span>
                        <button className="p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
                          <Heart className="w-4 h-4 text-white/70 hover:text-red-400" />
                        </button>
                      </div>
                      
                      {/* Classification */}
                      {movie.classification_code && (
                        <div className="absolute bottom-2 left-2">
                          <span className="text-xs px-2 py-1 bg-black/70 text-white rounded font-medium">
                            {movie.classification_code}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Movie Info */}
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 text-white line-clamp-2 group-hover:text-blue-400 transition-colors text-sm leading-relaxed">
                        {movie.title}
                      </h3>
                      
                      {movie.synopsis_short && (
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                          {movie.synopsis_short}
                        </p>
                      )}
                      
                      <div className="space-y-1.5 text-xs text-gray-400 mb-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(movie.duration_minutes)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Eye className="w-3 h-3" />
                          <span>{formatViews(movie.view_count)} vistas</span>
                        </div>
                        {movie.watch_count && movie.watch_count > 0 && (
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="w-3 h-3" />
                            <span>{movie.watch_count} reproducciones</span>
                          </div>
                        )}
                      </div>
                      
                      <Link
                        href={`/watch/${movie.slug}`}
                        className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-center py-2.5 rounded-lg transition-all duration-200 font-medium text-sm group-hover:shadow-lg"
                      >
                        Ver ahora
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    {/* List View */}
                    <div className="w-20 h-12 bg-gradient-to-br from-gray-700 to-gray-600 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {movie.poster_url ? (
                        <img 
                          src={movie.poster_url} 
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Play className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1 text-white hover:text-blue-400 transition-colors">
                            {movie.title}
                          </h3>
                          {movie.synopsis_short && (
                            <p className="text-sm text-gray-400 mb-2 line-clamp-1">
                              {movie.synopsis_short}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(movie.duration_minutes)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Eye className="w-3 h-3" />
                              <span>{formatViews(movie.view_count)}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              movie.is_free 
                                ? "bg-green-600/20 text-green-400 border border-green-600/30" 
                                : "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30"
                            }`}>
                              {movie.is_free ? "Gratis" : "Premium"}
                            </span>
                            {movie.classification_code && (
                              <span className="px-2 py-0.5 bg-gray-700/50 text-gray-300 text-xs rounded border border-gray-600/50">
                                {movie.classification_code}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Link
                          href={`/watch/${movie.slug}`}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 ml-4"
                        >
                          <Play className="w-3 h-3" />
                          <span>Ver</span>
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edición de Perfil */}
      {showEditProfile && userProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Editar Perfil</h3>
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData(prev => ({...prev, first_name: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ingresa tu nombre"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData(prev => ({...prev, last_name: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ingresa tu apellido"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({...prev, email: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ingresa tu email"
                  />
                </div>

                {/* Información de solo lectura */}
                <div className="pt-4 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Información de la cuenta</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Username:</span>
                      <span className="text-white">@{userProfile.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estado:</span>
                      <span className={userProfile.is_active ? "text-green-400" : "text-red-400"}>
                        {userProfile.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Verificado:</span>
                      <span className={userProfile.is_verified ? "text-green-400" : "text-yellow-400"}>
                        {userProfile.is_verified ? "Sí" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">2FA:</span>
                      <span className={userProfile.two_fa_enabled ? "text-green-400" : "text-gray-400"}>
                        {userProfile.two_fa_enabled ? "Habilitado" : "Deshabilitado"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Miembro desde:</span>
                      <span className="text-white">
                        {new Date(userProfile.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditProfile(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditProfile}
                disabled={editLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {editLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                <span>{editLoading ? "Guardando..." : "Guardar cambios"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}