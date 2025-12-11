import { Bell, LogOut, Home, User, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../atoms/Button';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavbarProps {
  onMenuClick: () => void;
}

export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { profile, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Botón hamburguesa para móvil */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden p-2"
              aria-label="Toggle menu"
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
                <span className="hidden md:inline">Dashboard</span>
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
                <h1 className="text-base sm:text-lg font-bold text-[#50504f] leading-tight">Maintenance</h1>
                <p className="text-xs text-gray-500 leading-tight">Management System</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#cf1b22] rounded-full"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="User menu"
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
                      onClick={() => {
                        setShowProfile(false);
                        signOut();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
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
