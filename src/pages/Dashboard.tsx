import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  ClipboardList,
  FileText,
  Ruler,
  Send,
  FileSpreadsheet,
  TrendingUp,
  AlertCircle,
  Users,
  Clock,
  FileCheck,
  ShoppingCart,
  Building2,
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  totalServiceOrders: number;
  totalSites: number;
  pendingMeasurements: number;
  pendingRequests: number;
  totalUsers: number;
  totalBudget: number;
  budgetUsed: number;
  avgResponseTime: number;
  avgExecutionTime: number;
}

export const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    pendingTasks: 0,
    totalServiceOrders: 0,
    totalSites: 0,
    pendingMeasurements: 0,
    pendingRequests: 0,
    totalUsers: 0,
    totalBudget: 0,
    budgetUsed: 0,
    avgResponseTime: 0,
    avgExecutionTime: 0,
  });
  useEffect(() => {
    loadStats();
  }, [profile]);

  const loadStats = async () => {
    if (!profile) return;

    const [tasksResult, serviceOrdersResult, sitesResult, measurementsResult, requestsResult, usersResult] =
      await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: false }),
        supabase.from('service_orders').select('*', { count: 'exact', head: false }),
        supabase.from('sites').select('*', { count: 'exact', head: false }),
        supabase.from('measurements').select('*', { count: 'exact', head: false }),
        supabase.from('internal_requests').select('*', { count: 'exact', head: false }),
        supabase.from('profiles').select('*', { count: 'exact', head: false }),
      ]);

    // Calcular presupuesto
    const totalBudget = tasksResult.data?.reduce((sum, t) => sum + (t.budget_amount || 0), 0) || 0;
    const budgetUsed = tasksResult.data
      ?.filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + (t.budget_amount || 0), 0) || 0;

    // Calcular tiempos promedio
    const completedTasks = tasksResult.data?.filter((t) => t.status === 'completed' && t.started_at && t.completed_at) || [];
    const avgExecutionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => {
          const start = new Date(t.started_at).getTime();
          const end = new Date(t.completed_at).getTime();
          return sum + (end - start) / (1000 * 60 * 60 * 24); // días
        }, 0) / completedTasks.length
      : 0;

    const avgResponseTime = tasksResult.data && tasksResult.data.length > 0
      ? tasksResult.data.reduce((sum, t) => {
          if (t.started_at) {
            const created = new Date(t.created_at).getTime();
            const started = new Date(t.started_at).getTime();
            return sum + (started - created) / (1000 * 60 * 60 * 24); // días
          }
          return sum;
        }, 0) / tasksResult.data.filter(t => t.started_at).length
      : 0;

    setStats({
      totalTasks: tasksResult.data?.length || 0,
      pendingTasks:
        tasksResult.data?.filter((t) => t.status === 'pending').length || 0,
      totalServiceOrders: serviceOrdersResult.data?.length || 0,
      totalSites: sitesResult.data?.length || 0,
      pendingMeasurements:
        measurementsResult.data?.filter((m) => m.status === 'pending').length || 0,
      pendingRequests:
        requestsResult.data?.filter((r) => r.status === 'pending').length || 0,
      totalUsers: usersResult.data?.length || 0,
      totalBudget,
      budgetUsed,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      avgExecutionTime: Math.round(avgExecutionTime * 10) / 10,
    });
  };

  const getModuleCards = () => {
    const allCards = [
      {
        id: 'sites',
        title: 'Sites & Projects',
        icon: MapPin,
        description: 'Manage locations and project details',
        stat: stats.totalSites,
        statLabel: 'Total Sites',
        gradient: 'from-blue-500 to-blue-600',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        animation: 'float-card',
        path: '/sites',
      },
      {
        id: 'tasks',
        title: 'Tasks',
        icon: ClipboardList,
        description: 'Track maintenance tasks and workflows',
        stat: stats.pendingTasks,
        statLabel: 'Pending Tasks',
        gradient: 'from-[#cf1b22] to-[#a0151a]',
        iconBg: 'bg-red-100',
        iconColor: 'text-[#cf1b22]',
        animation: 'float-card-reverse',
        path: '/tasks',
      },
      {
        id: 'service-orders',
        title: 'Service Orders',
        icon: FileText,
        description: 'Manage service orders and contractors',
        stat: stats.totalServiceOrders,
        statLabel: 'Total Orders',
        gradient: 'from-green-500 to-green-600',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        animation: 'float-card-slow',
        path: '/service-orders',
      },
      {
        id: 'purchase-orders',
        title: 'Purchase Orders',
        icon: ShoppingCart,
        description: 'Manage purchase orders with format',
        stat: 0,
        statLabel: 'Total Orders',
        gradient: 'from-purple-500 to-purple-600',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        animation: 'float-card',
        path: '/purchase-orders',
      },
      {
        id: 'contractors',
        title: 'Contractors',
        icon: Building2,
        description: 'Manage contractors database',
        stat: 0,
        statLabel: 'Total Contractors',
        gradient: 'from-amber-500 to-amber-600',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        animation: 'float-card-reverse',
        path: '/contractors',
      },
      {
        id: 'contracts',
        title: 'Contracts',
        icon: FileCheck,
        description: 'Manage labor and supply contracts',
        stat: 0,
        statLabel: 'Total Contracts',
        gradient: 'from-emerald-500 to-emerald-600',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        animation: 'float-card-slow',
        path: '/contracts',
      },
      {
        id: 'internal-requests',
        title: 'Internal Requests',
        icon: Send,
        description: 'Submit department requests',
        stat: stats.pendingRequests,
        statLabel: 'Pending Requests',
        gradient: 'from-orange-500 to-orange-600',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        animation: 'float-card-reverse',
        path: '/internal-requests',
      },
      {
        id: 'quotations',
        title: 'Quotation Comparison',
        icon: FileSpreadsheet,
        description: 'Compare and review quotations',
        stat: 0,
        statLabel: 'Pending Review',
        gradient: 'from-teal-500 to-teal-600',
        iconBg: 'bg-teal-100',
        iconColor: 'text-teal-600',
        animation: 'float-card-slow',
        path: '/quotations',
      },
      {
        id: 'contract-tracking',
        title: 'Contract Tracking',
        icon: FileCheck,
        description: 'Measurements and deadline compliance',
        stat: stats.pendingMeasurements,
        statLabel: 'Pending Measurements',
        gradient: 'from-cyan-500 to-cyan-600',
        iconBg: 'bg-cyan-100',
        iconColor: 'text-cyan-600',
        animation: 'float-card',
        path: '/contract-tracking',
      },
      {
        id: 'users',
        title: 'Users & Roles',
        icon: Users,
        description: 'Manage users and permissions',
        stat: stats.totalUsers,
        statLabel: 'Total Users',
        gradient: 'from-indigo-500 to-indigo-600',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        animation: 'float-card',
        path: '/users',
      },
    ];

    if (profile?.role === 'internal_client') {
      return allCards.filter((c) => ['internal-requests'].includes(c.id));
    }

    if (profile?.role === 'contractor') {
      return allCards.filter((c) => ['tasks', 'service-orders'].includes(c.id));
    }

    if (profile?.role === 'supervision') {
      return allCards.filter((c) => !['users'].includes(c.id));
    }

    // Admin e Infrastructure ven todo
    return allCards;
  };

  const moduleCards = getModuleCards();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 -z-10"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#50504f] mb-1 sm:mb-2">
              Welcome, <span className="text-[#cf1b22] break-words">{profile?.full_name}</span>
            </h1>
            <p className="text-gray-600 text-sm sm:text-base md:text-lg">
              Manage your maintenance operations with ease
            </p>
          </div>
        </div>

        {/* Indicadores Principales - Fila 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
          <Card className="glass-card hover-lift border-l-4 border-[#cf1b22]">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Presupuesto Total</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#cf1b22] mt-1 sm:mt-2 truncate">
                  ${(stats.totalBudget / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-gray-500 mt-1">COP</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-[#cf1b22]" />
              </div>
            </div>
          </Card>

          <Card className="glass-card hover-lift border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Presupuesto Ejecutado</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2 truncate">
                  ${(stats.budgetUsed / 1000000).toFixed(1)}M
                </p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all" 
                    style={{ width: `${stats.totalBudget > 0 ? (stats.budgetUsed / stats.totalBudget) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="glass-card hover-lift border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Tiempo Respuesta Promedio</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1 sm:mt-2">
                  {stats.avgResponseTime.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">días</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="glass-card hover-lift border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Tiempo Ejecución Promedio</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1 sm:mt-2">
                  {stats.avgExecutionTime.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">días</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Indicadores Secundarios - Fila 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-12">
          <Card className="glass-card hover-lift">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Tareas Pendientes</p>
                <p className="text-3xl sm:text-4xl font-bold text-[#cf1b22] mt-1 sm:mt-2">
                  {stats.pendingTasks}
                </p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-[#cf1b22]" />
              </div>
            </div>
          </Card>

          <Card className="glass-card hover-lift">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Sedes</p>
                <p className="text-3xl sm:text-4xl font-bold text-[#50504f] mt-1 sm:mt-2">
                  {stats.totalSites}
                </p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="glass-card hover-lift">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Tareas</p>
                <p className="text-3xl sm:text-4xl font-bold text-[#50504f] mt-1 sm:mt-2">
                  {stats.totalTasks}
                </p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Floating Module Cards */}
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#50504f] mb-4 sm:mb-6 md:mb-8 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="h-1 w-8 sm:w-12 md:w-16 bg-gradient-to-r from-[#cf1b22] to-[#50504f] rounded-full"></span>
            <span className="whitespace-nowrap">Module Access</span>
            <span className="h-1 w-8 sm:w-12 md:w-16 bg-gradient-to-l from-[#cf1b22] to-[#50504f] rounded-full"></span>
          </h2>
          
          {/* Grid de tarjetas - 4 por fila */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            {moduleCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Link key={card.id} to={card.path} className="block h-full">
                  <div
                    className={`glass-card card-gradient hover-lift glow-on-hover rounded-2xl p-6 h-full cursor-pointer group relative overflow-hidden ${card.animation}`}
                    style={{
                      animationDelay: `${index * 0.2}s`,
                    }}
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl`}></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 ${card.iconBg} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                          <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${card.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-[#50504f] mb-1 group-hover:text-[#cf1b22] transition-colors break-words">
                            {card.title}
                          </h3>
                        </div>
                      </div>

                      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4 line-clamp-2">
                        {card.description}
                      </p>

                      <div className="pt-3 sm:pt-4 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          {card.statLabel}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-[#50504f]">
                          {card.stat}
                        </p>
                      </div>

                      {/* Decorative corner accent */}
                      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${card.gradient} opacity-5 rounded-bl-full`}></div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
