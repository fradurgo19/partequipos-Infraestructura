import { Bell, LogOut, Home, User } from 'lucide-react';
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
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {location.pathname !== '/dashboard' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            )}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="w-10 h-10 bg-[#cf1b22] rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">M</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#50504f]">Maintenance</h1>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#cf1b22] rounded-full"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-[#50504f]">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span>{getRoleBadge(profile?.role)}</span>
                    <span className="capitalize">{profile?.role?.replace('_', ' ')}</span>
                  </p>
                </div>
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
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
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
