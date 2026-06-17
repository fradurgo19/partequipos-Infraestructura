import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePagosAuth } from '../context/PagosAuthContext';

interface PagosAuthLayoutProps {
  children: React.ReactNode;
}

export const PagosAuthLayout: React.FC<PagosAuthLayoutProps> = ({ children }) => {
  const { user, loading } = usePagosAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/pagos/reports" replace />;
  }

  return <>{children}</>;
};
