import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePagosAuth } from '../context/PagosAuthContext';
import { PagosNavbar } from '../organisms/PagosNavbar';

interface PagosProtectedLayoutProps {
  children: React.ReactNode;
}

export const PagosProtectedLayout: React.FC<PagosProtectedLayoutProps> = ({ children }) => {
  const { user: pagosUser, loading: pagosLoading } = usePagosAuth();
  const { user: mainUser, profile: mainProfile, loading: mainLoading } = useAuth();

  const loading = pagosLoading || mainLoading;
  const hasAccess = Boolean(pagosUser) || (mainProfile?.role === 'admin' && Boolean(mainUser));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]" />
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PagosNavbar />
      <main className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
};
