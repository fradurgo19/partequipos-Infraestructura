import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PagosAuthProvider, usePagosAuth } from './context/PagosAuthContext';
import { PagosAuthLayout } from './templates/PagosAuthLayout';
import { PagosProtectedLayout } from './templates/PagosProtectedLayout';
import { PagosRoleProtectedRoute } from './components/PagosRoleProtectedRoute';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const NewBillPage = lazy(() => import('./pages/NewBillPage').then((m) => ({ default: m.NewBillPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const BillsPage = lazy(() => import('./pages/BillsPage').then((m) => ({ default: m.BillsPage })));
const EditBillPage = lazy(() => import('./pages/EditBillPage').then((m) => ({ default: m.EditBillPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]" />
  </div>
);

const PagosHomeRedirect = () => {
  const { isInfraAdminAccess, loading } = usePagosAuth();
  if (loading) return <Loading />;
  return <Navigate to={isInfraAdminAccess ? 'bills' : 'reports'} replace />;
};

const PagosUserOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isInfraAdminAccess, loading } = usePagosAuth();
  if (loading) return <Loading />;
  if (isInfraAdminAccess) return <Navigate to="/pagos/bills" replace />;
  return <>{children}</>;
};

export const PagosApp = () => (
  <PagosAuthProvider>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route
          path="login"
          element={
            <PagosAuthLayout>
              <LoginPage />
            </PagosAuthLayout>
          }
        />
        <Route
          path="signup"
          element={
            <PagosAuthLayout>
              <SignupPage />
            </PagosAuthLayout>
          }
        />
        <Route
          path="new-bill"
          element={
            <PagosProtectedLayout>
              <PagosUserOnlyRoute>
                <NewBillPage />
              </PagosUserOnlyRoute>
            </PagosProtectedLayout>
          }
        />
        <Route
          path="reports"
          element={
            <PagosProtectedLayout>
              <PagosUserOnlyRoute>
                <ReportsPage />
              </PagosUserOnlyRoute>
            </PagosProtectedLayout>
          }
        />
        <Route
          path="reports/edit/:id"
          element={
            <PagosProtectedLayout>
              <PagosUserOnlyRoute>
                <EditBillPage />
              </PagosUserOnlyRoute>
            </PagosProtectedLayout>
          }
        />
        <Route
          path="bills"
          element={
            <PagosProtectedLayout>
              <PagosRoleProtectedRoute allowedRoles={['area_coordinator']}>
                <BillsPage />
              </PagosRoleProtectedRoute>
            </PagosProtectedLayout>
          }
        />
        <Route
          path="users"
          element={
            <PagosProtectedLayout>
              <PagosRoleProtectedRoute allowedRoles={['area_coordinator']}>
                <UsersPage />
              </PagosRoleProtectedRoute>
            </PagosProtectedLayout>
          }
        />
        <Route path="" element={<PagosHomeRedirect />} />
        <Route path="*" element={<PagosHomeRedirect />} />
      </Routes>
    </Suspense>
  </PagosAuthProvider>
);
