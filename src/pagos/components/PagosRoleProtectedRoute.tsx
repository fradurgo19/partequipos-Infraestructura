import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePagosAuth } from '../context/PagosAuthContext';
import { UserRole } from '../types';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const PagosRoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { profile, loading } = usePagosAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]" />
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/pagos/reports" replace />;
  }

  return <>{children}</>;
};
