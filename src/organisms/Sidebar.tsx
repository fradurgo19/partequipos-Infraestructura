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
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { profile } = useAuth();
  const location = useLocation();

  const getAvailableModules = () => {
    const allModules = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { id: 'sites', label: 'Sites & Projects', icon: MapPin, path: '/sites' },
      { id: 'tasks', label: 'Tasks', icon: ClipboardList, path: '/tasks' },
      { id: 'service-orders', label: 'Service Orders', icon: FileText, path: '/service-orders' },
      { id: 'measurements', label: 'Measurements', icon: Ruler, path: '/measurements' },
      { id: 'internal-requests', label: 'Internal Requests', icon: Send, path: '/internal-requests' },
      { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet, path: '/quotations' },
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
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white shadow-lg z-40 w-64 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <h2 className="font-semibold text-[#50504f]">Menu</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = location.pathname === module.path;

            return (
              <Link
                key={module.id}
                to={module.path}
                onClick={handleLinkClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#cf1b22] text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{module.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
