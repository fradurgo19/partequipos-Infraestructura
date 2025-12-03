import { Outlet } from 'react-router-dom';
import { Navbar } from '../organisms/Navbar';

export const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar onMenuClick={() => {}} />

      <div className="transition-all duration-300">
        <div className="p-6 space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

