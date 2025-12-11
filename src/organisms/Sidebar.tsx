import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  FileText,
  Ruler,
  Send,
  FileSpreadsheet,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Building2,
  FileCheck,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) => {
  const { profile } = useAuth();
  const location = useLocation();

  const getAvailableModules = () => {
    const allModules = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { id: 'sites', label: 'Sites & Projects', icon: MapPin, path: '/sites' },
      { id: 'tasks', label: 'Tasks', icon: ClipboardList, path: '/tasks' },
      { id: 'service-orders', label: 'Service Orders', icon: FileText, path: '/service-orders' },
      { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, path: '/purchase-orders' },
      { id: 'contractors', label: 'Contractors', icon: Building2, path: '/contractors' },
      { id: 'contracts', label: 'Contracts', icon: FileCheck, path: '/contracts' },
      { id: 'measurements', label: 'Measurements', icon: Ruler, path: '/measurements' },
      { id: 'internal-requests', label: 'Internal Requests', icon: Send, path: '/internal-requests' },
      { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet, path: '/quotations' },
      { id: 'contract-tracking', label: 'Contract Tracking', icon: FileCheck, path: '/contract-tracking' },
      { id: 'users', label: 'Users & Roles', icon: Users, path: '/users' },
    ];

    if (profile?.role === 'internal_client') {
      return allModules.filter((m) =>
        ['dashboard', 'tasks', 'internal-requests'].includes(m.id)
      );
    }

    if (profile?.role === 'contractor') {
      return allModules.filter((m) => ['dashboard', 'tasks', 'service-orders'].includes(m.id));
    }

    if (profile?.role === 'admin' || profile?.role === 'infrastructure') {
      return allModules;
    }

    return allModules.filter((m) => m.id !== 'users');
  };

  const modules = getAvailableModules();

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white shadow-lg z-40 transition-all duration-300 flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Header con botón de colapsar (solo desktop) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          {!isCollapsed && (
            <h2 className="font-semibold text-[#50504f] lg:block hidden">Menu</h2>
          )}
          <div className="flex items-center gap-2">
            {isCollapsed && (
              <h2 className="font-semibold text-[#50504f] lg:hidden">Menu</h2>
            )}
            {/* Botón cerrar para móvil */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
            {/* Botón colapsar/expandir para desktop */}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center"
                title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        <nav className={`p-4 space-y-2 overflow-y-auto flex-1 ${isCollapsed ? 'px-2' : ''}`}>
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = location.pathname === module.path;

            return (
              <Link
                key={module.id}
                to={module.path}
                onClick={handleLinkClick}
                className={`w-full flex items-center gap-3 rounded-lg transition-all group relative ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
                } ${
                  isActive
                    ? 'bg-[#cf1b22] text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={isCollapsed ? module.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : ''}`} />
                {!isCollapsed && (
                  <span className="font-medium">{module.label}</span>
                )}
                {/* Tooltip para modo colapsado */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50 shadow-lg">
                    {module.label}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
