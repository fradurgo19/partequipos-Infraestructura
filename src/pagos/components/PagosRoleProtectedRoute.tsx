import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePagosAuth } from '../context/PagosAuthContext';
import { UserRole } from '../types';
import { canAccessPagosBillManagement } from '../utils/pagosPermissions';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  allowTi?: boolean;
}

export const PagosRoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  allowTi = false,
}) => {
  const { profile, loading } = usePagosAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]" />
      </div>
    );
  }

  const hasRoleAccess = Boolean(profile && allowedRoles.includes(profile.role));
  const hasTiAccess = allowTi && canAccessPagosBillManagement(profile) && Boolean(profile?.isTi);

  if (!profile || (!hasRoleAccess && !hasTiAccess)) {
    return <Navigate to="/pagos/reports" replace />;
  }

  return <>{children}</>;
};
