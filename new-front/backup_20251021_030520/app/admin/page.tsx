"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import Link from "next/link";
import { 
  ArrowLeft, 
  Play, 
  Search,
  Filter,
  Users,
  Shield,
  Crown,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  RefreshCw,
  Download,
  Settings,
  Lock,
  Unlock,
  CreditCard,
  Mail,
  User,
  Clock,
  TrendingUp
} from "lucide-react";

// Types
interface AppUser {
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
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

interface UserDetail extends AppUser {
  email_tokens_total: number;
  email_tokens_active: number;
  refresh_tokens_total: number;
  refresh_tokens_active: number;
}

interface UserCounters {
  count_total: number;
  count_active: number;
  count_verified: number;
  count_paid: number;
  count_admin: number;
  count_content_handler: number;
  count_twofa_enabled: number;
  count_locked: number;
  count_failed_ge_n: number;
}

interface UsersResponse {
  total_count: number;
  items: AppUser[];
}

interface FilterState {
  query: string;
  is_active: boolean | null;
  is_verified: boolean | null;
  is_paid: boolean | null;
  is_admin: boolean | null;
  is_content_handler: boolean | null;
  two_fa_enabled: boolean | null;
  locked_only: boolean | null;
  order_by: string;
  order_dir: string;
  limit: number;
  offset: number;
}

const API_BASE = "http://34.135.146.173.nip.io/ususarios/users";

export default function AdminPanel() {
  const router = useRouter();
  const { token } = useAuth();
  
  // State
  const [users, setUsers] = useState<AppUser[]>([]);
  const [counters, setCounters] = useState<UserCounters | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    is_active: null,
    is_verified: null,
    is_paid: null,
    is_admin: null,
    is_content_handler: null,
    two_fa_enabled: null,
    locked_only: null,
    order_by: "created_at",
    order_dir: "DESC",
    limit: 20,
    offset: 0
  });

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadInitialData();
  }, [token, router]);

  const loadInitialData = async () => {
    await Promise.all([
      loadUsers(),
      // loadCounters() // Comentar temporalmente si sigue fallando
    ]);
    
    // Cargar contadores por separado con manejo de errores
    try {
      await loadCounters();
    } catch (error) {
      console.warn("No se pudieron cargar los contadores, continuando sin ellos");
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`https://34.10.139.168.nip.io/ususarios/users/list?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data: UsersResponse = await response.json();
      setUsers(data.items);
      setTotalCount(data.total_count);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCounters = async () => {
    try {
      console.log("🔍 Intentando cargar contadores...");
      console.log("Token:", token ? "Presente" : "No presente");
      console.log("URL:", `https://34.10.139.168.nip.io/ususarios/users/counters`);
      
      const response = await fetch(`https://34.10.139.168.nip.io/ususarios/users/counters`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: UserCounters = await response.json();
      console.log("Contadores cargados:", data);
      setCounters(data);
    } catch (error) {
      console.error("Error loading counters:", error);
      
      // Mostrar contadores por defecto para que no se rompa la UI
      setCounters({
        count_total: 0,
        count_active: 0,
        count_verified: 0,
        count_paid: 0,
        count_admin: 0,
        count_content_handler: 0,
        count_twofa_enabled: 0,
        count_locked: 0,
        count_failed_ge_n: 0
      });
    }
  };

  const loadUserDetail = async (userId: number) => {
    try {
      const response = await fetch(`https://34.10.139.168.nip.io/ususarios/users/${userId}/detail`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Error al cargar detalle del usuario");
      }

      const data: UserDetail = await response.json();
      setSelectedUser(data);
      setShowUserDetail(true);
    } catch (error) {
      console.error("Error loading user detail:", error);
    }
  };

  const updateUserField = async (userId: number, field: string, value: boolean) => {
    setActionLoading(`${field}-${userId}`);
    try {
      const response = await fetch(`https://34.10.139.168.nip.io/ususarios/users/${userId}/${field}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ [`is_${field}`]: value })
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar ${field}`);
      }

      // Reload users and counters
      await Promise.all([loadUsers(), loadCounters()]);
      
      // Update selected user if viewing detail
      if (selectedUser && selectedUser.id === userId) {
        await loadUserDetail(userId);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset pagination when filters change
    }));
  };

  const applyFilters = () => {
    loadUsers();
  };

  const resetFilters = () => {
    setFilters({
      query: "",
      is_active: null,
      is_verified: null,
      is_paid: null,
      is_admin: null,
      is_content_handler: null,
      two_fa_enabled: null,
      locked_only: null,
      order_by: "created_at",
      order_dir: "DESC",
      limit: 20,
      offset: 0
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (user: AppUser) => {
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded-full border border-red-700/50">Bloqueado</span>;
    }
    if (!user.is_active) {
      return <span className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full border border-gray-600/50">Inactivo</span>;
    }
    if (!user.is_verified) {
      return <span className="px-2 py-1 bg-yellow-900/50 text-yellow-300 text-xs rounded-full border border-yellow-700/50">Sin verificar</span>;
    }
    return <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded-full border border-green-700/50">Activo</span>;
  };

  const getRoleBadges = (user: AppUser) => {
    const badges = [];
    if (user.is_admin) {
      badges.push(<span key="admin" className="px-2 py-0.5 bg-red-900/50 text-red-300 text-xs rounded-full border border-red-700/50">Admin</span>);
    }
    if (user.is_content_handler) {
      badges.push(<span key="content" className="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded-full border border-purple-700/50">Content</span>);
    }
    if (user.is_paid) {
      badges.push(<span key="paid" className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 text-xs rounded-full border border-yellow-700/50">Premium</span>);
    }
    return badges;
  };

  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(totalCount / filters.limit);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <Link href="/catalog" className="flex items-center space-x-2 group">
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                <span className="text-gray-400 group-hover:text-white transition-colors font-medium">
                  Volver al catálogo
                </span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-orange-600 rounded flex items-center justify-center">
                <Shield className="w-4 h-4 fill-white" />
              </div>
              <span className="text-xl font-bold">Panel de Administración</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => loadInitialData()}
                className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        {counters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">{counters.count_total}</p>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400">Activos</span>
              </div>
              <p className="text-2xl font-bold text-white">{counters.count_active}</p>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-400">Verificados</span>
              </div>
              <p className="text-2xl font-bold text-white">{counters.count_verified}</p>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">Premium</span>
              </div>
              <p className="text-2xl font-bold text-white">{counters.count_paid}</p>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-red-400" />
                <span className="text-xs text-gray-400">Admins</span>
              </div>
              <p className="text-2xl font-bold text-white">{counters.count_admin}</p>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Lock className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-400">Bloqueados</span>
              </div>
              <p className="text-2xl font-bold text-white">{counters.count_locked}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 backdrop-blur-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-blue-400" />
              <span className="font-medium">Filtros</span>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              <span>{showFilters ? 'Ocultar' : 'Mostrar'}</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por email o username..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Buscar
            </button>
            <button
              onClick={() => {
                resetFilters();
                setTimeout(loadUsers, 100);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Limpiar
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { key: 'is_active', label: 'Activo' },
                { key: 'is_verified', label: 'Verificado' },
                { key: 'is_paid', label: 'Premium' },
                { key: 'is_admin', label: 'Admin' },
                { key: 'is_content_handler', label: 'Content Handler' },
                { key: 'locked_only', label: 'Bloqueado' }
              ].map(({ key, label }) => (
                <select
                  key={key}
                  value={filters[key as keyof FilterState]?.toString() || ""}
                  onChange={(e) => handleFilterChange(key as keyof FilterState, e.target.value === "" ? null : e.target.value === "true")}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{label}: Todos</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              ))}
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800/50 backdrop-blur-sm overflow-hidden">
          <div className="p-4 border-b border-gray-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Usuarios ({totalCount})
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Página {currentPage} de {totalPages}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-gray-300">Cargando usuarios...</span>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No se encontraron usuarios</h3>
              <p className="text-gray-400">Ajusta los filtros para ver más resultados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/50 bg-gray-800/30">
                    <th className="text-left p-4 font-medium text-gray-300">Usuario</th>
                    <th className="text-left p-4 font-medium text-gray-300">Estado</th>
                    <th className="text-left p-4 font-medium text-gray-300">Roles</th>
                    <th className="text-left p-4 font-medium text-gray-300">Intentos</th>
                    <th className="text-left p-4 font-medium text-gray-300">Creado</th>
                    <th className="text-center p-4 font-medium text-gray-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-800/30 hover:bg-gray-800/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-white">{user.first_name} {user.last_name}</div>
                          <div className="text-sm text-gray-400">@{user.username}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {getStatusBadge(user)}
                          {user.two_fa_enabled && (
                            <div className="flex items-center space-x-1 text-xs text-green-400">
                              <Shield className="w-3 h-3" />
                              <span>2FA</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {getRoleBadges(user)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm ${user.failed_login_attempts > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {user.failed_login_attempts}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-400">
                          {formatDate(user.created_at)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => loadUserDetail(user.id)}
                            className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4 text-blue-400" />
                          </button>
                          
                          <button
                            onClick={() => updateUserField(user.id, 'active', !user.is_active)}
                            disabled={actionLoading === `active-${user.id}`}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.is_active 
                                ? 'bg-red-600/20 hover:bg-red-600/30' 
                                : 'bg-green-600/20 hover:bg-green-600/30'
                            }`}
                            title={user.is_active ? "Desactivar" : "Activar"}
                          >
                            {actionLoading === `active-${user.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : user.is_active ? (
                              <UserX className="w-4 h-4 text-red-400" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-green-400" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => updateUserField(user.id, 'paid', !user.is_paid)}
                            disabled={actionLoading === `paid-${user.id}`}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.is_paid 
                                ? 'bg-yellow-600/20 hover:bg-yellow-600/30' 
                                : 'bg-purple-600/20 hover:bg-purple-600/30'
                            }`}
                            title={user.is_paid ? "Quitar Premium" : "Dar Premium"}
                          >
                            {actionLoading === `paid-${user.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-purple-400" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-800/50 flex items-center justify-between">
              <button
                onClick={() => {
                  handleFilterChange('offset', Math.max(0, filters.offset - filters.limit));
                  setTimeout(loadUsers, 100);
                }}
                disabled={filters.offset === 0}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
              >
                Anterior
              </button>
              
              <span className="text-sm text-gray-400">
                Mostrando {filters.offset + 1} a {Math.min(filters.offset + filters.limit, totalCount)} de {totalCount}
              </span>
              
              <button
                onClick={() => {
                  handleFilterChange('offset', filters.offset + filters.limit);
                  setTimeout(loadUsers, 100);
                }}
                disabled={filters.offset + filters.limit >= totalCount}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>

        {/* User Detail Modal */}
        {showUserDetail && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Detalles del Usuario</h3>
                  <button
                    onClick={() => setShowUserDetail(false)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Información Personal</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Nombre completo</label>
                      <p className="text-white">{selectedUser.first_name} {selectedUser.last_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Username</label>
                      <p className="text-white">@{selectedUser.username}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm text-gray-400">Email</label>
                      <p className="text-white">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>

                {/* Status & Roles */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Estado y Roles</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Activo</span>
                        <button
                          onClick={() => updateUserField(selectedUser.id, 'verified', !selectedUser.is_verified)}
                          disabled={actionLoading === `verified-${selectedUser.id}`}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            selectedUser.is_verified 
                              ? 'bg-green-900/50 text-green-300' 
                              : 'bg-yellow-900/50 text-yellow-300'
                          }`}
                        >
                          {actionLoading === `verified-${selectedUser.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : selectedUser.is_verified ? 'Sí' : 'No'}
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Premium</span>
                        <button
                          onClick={() => updateUserField(selectedUser.id, 'paid', !selectedUser.is_paid)}
                          disabled={actionLoading === `paid-${selectedUser.id}`}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            selectedUser.is_paid 
                              ? 'bg-purple-900/50 text-purple-300' 
                              : 'bg-gray-700/50 text-gray-300'
                          }`}
                        >
                          {actionLoading === `paid-${selectedUser.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : selectedUser.is_paid ? 'Sí' : 'No'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Admin</span>
                        <button
                          onClick={() => updateUserField(selectedUser.id, 'admin', !selectedUser.is_admin)}
                          disabled={actionLoading === `admin-${selectedUser.id}`}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            selectedUser.is_admin 
                              ? 'bg-red-900/50 text-red-300' 
                              : 'bg-gray-700/50 text-gray-300'
                          }`}
                        >
                          {actionLoading === `admin-${selectedUser.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : selectedUser.is_admin ? 'Sí' : 'No'}
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Content Handler</span>
                        <button
                          onClick={() => updateUserField(selectedUser.id, 'content-handler', !selectedUser.is_content_handler)}
                          disabled={actionLoading === `content-handler-${selectedUser.id}`}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            selectedUser.is_content_handler 
                              ? 'bg-purple-900/50 text-purple-300' 
                              : 'bg-gray-700/50 text-gray-300'
                          }`}
                        >
                          {actionLoading === `content-handler-${selectedUser.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : selectedUser.is_content_handler ? 'Sí' : 'No'}
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">2FA Activo</span>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          selectedUser.two_fa_enabled 
                            ? 'bg-green-900/50 text-green-300' 
                            : 'bg-gray-700/50 text-gray-300'
                        }`}>
                          {selectedUser.two_fa_enabled ? 'Sí' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Info */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Información de Seguridad</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Intentos de login fallidos</label>
                      <p className={`text-lg font-medium ${
                        selectedUser.failed_login_attempts > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {selectedUser.failed_login_attempts}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Estado de bloqueo</label>
                      <p className={`text-sm ${
                        selectedUser.locked_until && new Date(selectedUser.locked_until) > new Date() 
                          ? 'text-red-400' 
                          : 'text-green-400'
                      }`}>
                        {selectedUser.locked_until && new Date(selectedUser.locked_until) > new Date() 
                          ? `Bloqueado hasta ${formatDate(selectedUser.locked_until)}`
                          : 'No bloqueado'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Token Statistics */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Estadísticas de Tokens</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Tokens de email (total)</span>
                        <span className="text-white">{selectedUser.email_tokens_total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Tokens de email (activos)</span>
                        <span className="text-green-400">{selectedUser.email_tokens_active}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Tokens de refresh (total)</span>
                        <span className="text-white">{selectedUser.refresh_tokens_total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Tokens de refresh (activos)</span>
                        <span className="text-green-400">{selectedUser.refresh_tokens_active}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Fechas Importantes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Creado</label>
                      <p className="text-white">{formatDate(selectedUser.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Última actualización</label>
                      <p className="text-white">{formatDate(selectedUser.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-800 flex justify-end">
                <button
                  onClick={() => setShowUserDetail(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}