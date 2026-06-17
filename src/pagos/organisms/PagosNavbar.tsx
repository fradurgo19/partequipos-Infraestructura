import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, PlusCircle, LogOut, BarChart3, Users } from 'lucide-react';
import { usePagosAuth } from '../context/PagosAuthContext';

export const PagosNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = usePagosAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/pagos/login');
  };

  const allNavItems = [
    { path: '/pagos/bills', label: 'Facturas', icon: FileText, roles: ['area_coordinator'] },
    { path: '/pagos/new-bill', label: 'Nueva Factura', icon: PlusCircle, roles: ['area_coordinator', 'basic_user'] },
    { path: '/pagos/reports', label: 'Mis Facturas', icon: BarChart3, roles: ['area_coordinator', 'basic_user'] },
    { path: '/pagos/users', label: 'Usuarios', icon: Users, roles: ['area_coordinator'] },
  ];

  const navItems = allNavItems.filter((item) =>
    item.roles.includes(profile?.role || 'basic_user')
  );

  return (
    <nav className="bg-gradient-to-r from-[#cf1b22] via-[#a11217] to-[#50504f] border-b border-[#cf1b22]/60 sticky top-0 z-50 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link to="/pagos/reports" className="flex items-center space-x-2">
              <span className="text-lg font-bold text-white">Pagos · Facturas</span>
            </Link>
            <div className="hidden md:flex space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">{profile?.fullName}</p>
              <p className="text-xs text-white/80 capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 py-2 bg-[#a11217] text-white rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
