import { Bell, LogOut, Home, User, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../atoms/Button';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import { syncMaintenanceAlerts } from '../services/maintenanceAlerts';

interface NavbarProps {
  onMenuClick: () => void;
}

export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { profile, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return;

    if (profile.role === 'admin') {
      await syncMaintenanceAlerts();
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getRoleBadge = (role?: string) => {
    const badges = {
      admin: '👨‍💻',
      infrastructure: '👷‍♂️',
      supervision: '🧑‍💼',
      contractor: '👨‍🔧',
      internal_client: '🧑‍🏫',
    };
    return badges[role as keyof typeof badges] || '👤';
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    setShowNotifications(false);
    if (notification.type === 'maintenance') {
      navigate('/mantenimientos');
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden p-2"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5 text-[#50504f]" />
            </Button>

            {location.pathname !== '/dashboard' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex items-center gap-2"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden md:inline">Panel</span>
              </Button>
            )}

            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer"
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#cf1b22] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg sm:text-xl font-bold">M</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-bold text-[#50504f] leading-tight">Mantenimiento</h1>
                <p className="text-xs text-gray-500 leading-tight">Sistema de Gestión</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfile(false);
                }}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notificaciones"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-[#cf1b22] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-96 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <h3 className="font-semibold text-[#50504f]">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-xs text-[#cf1b22] hover:underline"
                        >
                          Marcar todas leídas
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-500 text-center">Sin notificaciones</p>
                    ) : (
                      <ul>
                        {notifications.map((notification) => (
                          <li key={notification.id}>
                            <button
                              type="button"
                              onClick={() => handleNotificationClick(notification)}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 ${
                                notification.read ? 'opacity-70' : 'bg-red-50/40'
                              }`}
                            >
                              <p className="text-sm font-medium text-[#50504f]">{notification.title}</p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(notification.created_at).toLocaleString('es-CO')}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfile(!showProfile);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Menú de usuario"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs sm:text-sm font-medium text-[#50504f] truncate max-w-[120px]">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span>{getRoleBadge(profile?.role)}</span>
                    <span className="capitalize hidden md:inline">{profile?.role?.replace('_', ' ')}</span>
                  </p>
                </div>
              </button>

              {showProfile && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfile(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfile(false);
                        signOut();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
