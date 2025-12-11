import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../organisms/Navbar';
import { Sidebar } from '../organisms/Sidebar';

const SIDEBAR_STATE_KEY = 'sidebar-collapsed';

export const Layout = () => {
  // Estado para móvil (abierto/cerrado)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estado para desktop (colapsado/expandido)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // Guardar estado del sidebar colapsado en localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

