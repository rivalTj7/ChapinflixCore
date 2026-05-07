"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import { 
  Play, 
  ArrowLeft, 
  Upload, 
  Check, 
  AlertCircle,
  Film,
  Calendar,
  Type,
  Tag,
  Globe,
  Crown,
  FileVideo,
  Plus,
  CheckCircle,
  Image,
  Link,
  Settings,
  Trash2,
  Edit,
  Save,
  X,
  Clock,
  Star,
  Map,
  Building,
  Video,
  Palette,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

interface Category {
  category_id: string;
  name: string;
  slug: string;
  parent_id?: string;
  is_active?: boolean;
}

interface MovieImage {
  id: string;
  url: string;
  label: string;
  sort_order: number;
}

interface MovieData {
  title: string;
  slug: string;
  synopsis_short: string;
  synopsis_long: string;
  duration_minutes: number;
  release_date: string;
  classification_code: string;
  studio_name: string;
  language: string;
  country: string;
  poster_url: string;
  banner_url: string;
  trailer_url: string;
  is_free: boolean;
  available_from: string;
  available_until: string;
  category_slugs: string[];
}

export default function UploadMovie() {
  const router = useRouter();
  const { token } = useAuth();
  
  // Navigation states
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'categories'>('single');
  
  // Movie form states (expandido)
  const [movieData, setMovieData] = useState<MovieData>({
    title: "",
    slug: "",
    synopsis_short: "",
    synopsis_long: "",
    duration_minutes: 0,
    release_date: new Date().toISOString().split('T')[0],
    classification_code: "",
    studio_name: "",
    language: "spanish",
    country: "GT",
    poster_url: "",
    banner_url: "",
    trailer_url: "",
    is_free: false,
    available_from: new Date().toISOString().split('T')[0],
    available_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category_slugs: []
  });

  // Bulk upload states
  const [bulkMovies, setBulkMovies] = useState<Partial<MovieData>[]>([]);
  const [bulkJsonInput, setBulkJsonInput] = useState("");

  // Categories management
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", parent_id: "" });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Movie images
  const [movieImages, setMovieImages] = useState<MovieImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageLabel, setNewImageLabel] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadCategories();
  }, [token, router]);

  // Auto-generate slug from title
  useEffect(() => {
    if (movieData.title) {
      const generatedSlug = movieData.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setMovieData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [movieData.title]);

  const API_BASE = "http://34.135.146.173.nip.io/inventario/catalog";

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  // Create category
  const createCategory = async () => {
    if (!newCategory.name.trim()) {
      showMessage("El nombre de la categoría es requerido", 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCategory.name,
          slug: newCategory.slug || newCategory.name.toLowerCase().replace(/\s+/g, '-'),
          parent_id: newCategory.parent_id || null
        })
      });

      if (res.ok) {
        showMessage("Categoría creada exitosamente", 'success');
        setNewCategory({ name: "", slug: "", parent_id: "" });
        await loadCategories();
      } else {
        const error = await res.json();
        showMessage(`Error: ${error.detail || res.statusText}`, 'error');
      }
    } catch (err) {
      showMessage(`Error de conexión: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update category
  const updateCategory = async () => {
    if (!editingCategory) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories/${editingCategory.category_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editingCategory)
      });

      if (res.ok) {
        showMessage("Categoría actualizada exitosamente", 'success');
        setEditingCategory(null);
        await loadCategories();
      } else {
        showMessage("Error al actualizar categoría", 'error');
      }
    } catch (err) {
      showMessage(`Error de conexión: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const deleteCategory = async (categoryId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories/${categoryId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        showMessage("Categoría eliminada exitosamente", 'success');
        await loadCategories();
      } else {
        showMessage("Error al eliminar categoría", 'error');
      }
    } catch (err) {
      showMessage(`Error de conexión: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create single movie
  const createSingleMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...movieData,
          created_by: "admin"
        })
      });

      if (res.ok) {
        showMessage("Película creada exitosamente", 'success');
        // Reset form
        setMovieData({
          title: "",
          slug: "",
          synopsis_short: "",
          synopsis_long: "",
          duration_minutes: 0,
          release_date: new Date().toISOString().split('T')[0],
          classification_code: "",
          studio_name: "",
          language: "spanish",
          country: "GT",
          poster_url: "",
          banner_url: "",
          trailer_url: "",
          is_free: false,
          available_from: new Date().toISOString().split('T')[0],
          available_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category_slugs: []
        });
      } else {
        const error = await res.json();
        showMessage(`Error: ${error.detail || res.statusText}`, 'error');
      }
    } catch (err) {
      showMessage(`Error de conexión: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bulk upsert movies
  const bulkUpsertMovies = async () => {
    if (bulkMovies.length === 0) {
      showMessage("Agrega al menos una película", 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/movies/bulk-upsert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          items: bulkMovies.map(movie => ({
            ...movie,
            categories: movie.category_slugs
          })),
          created_by: "admin"
        })
      });

      if (res.ok) {
        showMessage(`${bulkMovies.length} películas procesadas exitosamente`, 'success');
        setBulkMovies([]);
        setBulkJsonInput("");
      } else {
        const error = await res.json();
        showMessage(`Error: ${error.detail || res.statusText}`, 'error');
      }
    } catch (err) {
      showMessage(`Error de conexión: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkJsonImport = () => {
    try {
      const parsed = JSON.parse(bulkJsonInput);
      setBulkMovies(Array.isArray(parsed) ? parsed : [parsed]);
      showMessage("JSON importado correctamente", 'success');
    } catch (err) {
      showMessage("JSON inválido", 'error');
    }
  };

  const updateMovieData = (field: keyof MovieData, value: any) => {
    setMovieData(prev => ({ ...prev, [field]: value }));
  };

  const addBulkMovie = () => {
    setBulkMovies(prev => [...prev, {
      title: "",
      slug: "",
      synopsis_short: "",
      is_free: false,
      category_slugs: []
    }]);
  };

  const removeBulkMovie = (index: number) => {
    setBulkMovies(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.push("/catalog")}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver al catálogo</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                <Settings className="w-4 h-4 fill-white" />
              </div>
              <span className="text-xl font-bold">Gestión de Contenido</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { key: 'single', label: 'Nueva Película', icon: Film },
              { key: 'bulk', label: 'Carga Masiva', icon: Upload },
              { key: 'categories', label: 'Categorías', icon: Tag }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Global Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border flex items-center space-x-3 ${
            messageType === 'success' 
              ? 'bg-green-900/20 border-green-800 text-green-400' 
              : messageType === 'error'
              ? 'bg-red-900/20 border-red-800 text-red-400'
              : 'bg-blue-900/20 border-blue-800 text-blue-400'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p>{message}</p>
          </div>
        )}

        {/* Single Movie Upload */}
        {activeTab === 'single' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
                <Film className="w-6 h-6" />
                <span>Crear Nueva Película</span>
              </h2>

              <form onSubmit={createSingleMovie} className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Título *
                    </label>
                    <input 
                      type="text"
                      value={movieData.title}
                      onChange={(e) => updateMovieData('title', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre de la película"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Slug * <span className="text-gray-500">(auto-generado)</span>
                    </label>
                    <input 
                      type="text"
                      value={movieData.slug}
                      onChange={(e) => updateMovieData('slug', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Synopis */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sinopsis Corta *
                    </label>
                    <textarea 
                      value={movieData.synopsis_short}
                      onChange={(e) => updateMovieData('synopsis_short', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Descripción breve..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sinopsis Larga
                    </label>
                    <textarea 
                      value={movieData.synopsis_long}
                      onChange={(e) => updateMovieData('synopsis_long', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Descripción detallada..."
                    />
                  </div>
                </div>

                {/* Movie Details */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Clock className="inline w-4 h-4 mr-1" />
                      Duración (min)
                    </label>
                    <input 
                      type="number"
                      value={movieData.duration_minutes}
                      onChange={(e) => updateMovieData('duration_minutes', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      Fecha de Lanzamiento
                    </label>
                    <input 
                      type="date"
                      value={movieData.release_date}
                      onChange={(e) => updateMovieData('release_date', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Star className="inline w-4 h-4 mr-1" />
                      Clasificación
                    </label>
                    <input 
                      type="text"
                      value={movieData.classification_code}
                      onChange={(e) => updateMovieData('classification_code', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="G, PG, PG-13, R"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Globe className="inline w-4 h-4 mr-1" />
                      Idioma
                    </label>
                    <select 
                      value={movieData.language}
                      onChange={(e) => updateMovieData('language', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="spanish">Español</option>
                      <option value="english">Inglés</option>
                      <option value="kaqchikel">Kaqchikel</option>
                      <option value="quiche">Quiché</option>
                      <option value="mam">Mam</option>
                    </select>
                  </div>
                </div>

                {/* Production Details */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Building className="inline w-4 h-4 mr-1" />
                      Estudio/Productora
                    </label>
                    <input 
                      type="text"
                      value={movieData.studio_name}
                      onChange={(e) => updateMovieData('studio_name', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre del estudio"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Map className="inline w-4 h-4 mr-1" />
                      País
                    </label>
                    <input 
                      type="text"
                      value={movieData.country}
                      onChange={(e) => updateMovieData('country', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="GT"
                    />
                  </div>
                </div>

                {/* Media URLs */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center space-x-2">
                    <Image className="w-5 h-5" />
                    <span>Media y Enlaces</span>
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        URL del Poster
                      </label>
                      <input 
                        type="url"
                        value={movieData.poster_url}
                        onChange={(e) => updateMovieData('poster_url', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        URL del Banner
                      </label>
                      <input 
                        type="url"
                        value={movieData.banner_url}
                        onChange={(e) => updateMovieData('banner_url', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        URL del Trailer
                      </label>
                      <input 
                        type="url"
                        value={movieData.trailer_url}
                        onChange={(e) => updateMovieData('trailer_url', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Tag className="inline w-4 h-4 mr-1" />
                    Categorías
                  </label>
                  <div className="grid md:grid-cols-4 gap-2">
                    {categories.map(cat => (
                      <label key={cat.category_id} className="flex items-center space-x-2 p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700">
                        <input
                          type="checkbox"
                          checked={movieData.category_slugs.includes(cat.slug)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateMovieData('category_slugs', [...movieData.category_slugs, cat.slug]);
                            } else {
                              updateMovieData('category_slugs', movieData.category_slugs.filter(s => s !== cat.slug));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      Disponible desde
                    </label>
                    <input 
                      type="date"
                      value={movieData.available_from}
                      onChange={(e) => updateMovieData('available_from', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      Disponible hasta
                    </label>
                    <input 
                      type="date"
                      value={movieData.available_until}
                      onChange={(e) => updateMovieData('available_until', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Free/Premium Toggle */}
                <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => updateMovieData('is_free', !movieData.is_free)}
                    className="flex items-center space-x-2"
                  >
                    {movieData.is_free ? (
                      <ToggleRight className="w-6 h-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-500" />
                    )}
                  </button>
                  <div>
                    <span className="font-medium">
                      {movieData.is_free ? "Contenido Gratuito" : "Contenido Premium"}
                    </span>
                    <p className="text-sm text-gray-400">
                      {movieData.is_free ? "Acceso libre para todos los usuarios" : "Requiere suscripción premium"}
                    </p>
                  </div>
                  {!movieData.is_free && <Crown className="w-5 h-5 text-yellow-500" />}
                </div>

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Creando película...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Crear Película</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Upload */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
                <Upload className="w-6 h-6" />
                <span>Carga Masiva de Películas</span>
              </h2>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* JSON Input */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Importar desde JSON</h3>
                  <textarea
                    value={bulkJsonInput}
                    onChange={(e) => setBulkJsonInput(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder={JSON.stringify([
                      {
                        title: "Película 1",
                        slug: "pelicula-1",
                        synopsis_short: "Descripción breve",
                        is_free: false,
                        categories: ["accion", "drama"]
                      }
                    ], null, 2)}
                  />
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={handleBulkJsonImport}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Importar JSON
                    </button>
                    <button
                      onClick={() => setBulkJsonInput("")}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Manual Bulk Entry */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Agregar Manualmente</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {bulkMovies.map((movie, index) => (
                      <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm text-gray-400">Película {index + 1}</span>
                          <button
                            onClick={() => removeBulkMovie(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Título"
                            value={movie.title || ""}
                            onChange={(e) => {
                              const updated = [...bulkMovies];
                              updated[index] = { ...updated[index], title: e.target.value };
                              setBulkMovies(updated);
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Slug"
                            value={movie.slug || ""}
                            onChange={(e) => {
                              const updated = [...bulkMovies];
                              updated[index] = { ...updated[index], slug: e.target.value };
                              setBulkMovies(updated);
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <textarea
                            placeholder="Sinopsis corta"
                            value={movie.synopsis_short || ""}
                            onChange={(e) => {
                              const updated = [...bulkMovies];
                              updated[index] = { ...updated[index], synopsis_short: e.target.value };
                              setBulkMovies(updated);
                            }}
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                          <div className="flex items-center space-x-3">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={movie.is_free || false}
                                onChange={(e) => {
                                  const updated = [...bulkMovies];
                                  updated[index] = { ...updated[index], is_free: e.target.checked };
                                  setBulkMovies(updated);
                                }}
                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-300">Gratuito</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={addBulkMovie}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Película</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Submit */}
              {bulkMovies.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">
                      {bulkMovies.length} película{bulkMovies.length !== 1 ? 's' : ''} lista{bulkMovies.length !== 1 ? 's' : ''} para procesar
                    </span>
                    <button
                      onClick={bulkUpsertMovies}
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Procesar Todas</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories Management */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Create New Category */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
                <Plus className="w-6 h-6" />
                <span>Crear Nueva Categoría</span>
              </h2>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ 
                      ...prev, 
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
                    }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ej. Ciencia Ficción"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={newCategory.slug}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ciencia-ficcion"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Categoría Padre
                  </label>
                  <select
                    value={newCategory.parent_id}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, parent_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Categoría Principal</option>
                    {categories.filter(cat => !cat.parent_id).map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={createCategory}
                disabled={loading || !newCategory.name.trim()}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Creando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Crear Categoría</span>
                  </>
                )}
              </button>
            </div>

            {/* Categories List */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
                <Tag className="w-6 h-6" />
                <span>Categorías Existentes ({categories.length})</span>
              </h2>

              <div className="space-y-4">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay categorías creadas aún</p>
                  </div>
                ) : (
                  categories.map(category => (
                    <div
                      key={category.category_id}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex-1">
                        {editingCategory?.category_id === category.category_id ? (
                          <div className="grid md:grid-cols-3 gap-4">
                            <input
                              type="text"
                              value={editingCategory.name}
                              onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={editingCategory.slug}
                              onChange={(e) => setEditingCategory(prev => prev ? { ...prev, slug: e.target.value } : null)}
                              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={updateCategory}
                                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingCategory(null)}
                                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-3">
                              <span className="font-medium">{category.name}</span>
                              <span className="text-sm text-blue-400">/{category.slug}</span>
                              {category.parent_id && (
                                <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded border border-purple-700/50">
                                  Subcategoría
                                </span>
                              )}
                              {category.is_active === false && (
                                <span className="text-xs px-2 py-1 bg-red-900/50 text-red-300 rounded border border-red-700/50">
                                  Inactiva
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Editar categoría"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(category.category_id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}