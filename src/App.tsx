import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './pages/ProtectedRoute';
import { Layout } from './pages/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Sites } from './pages/Sites';
import { Tasks } from './pages/Tasks';
import { ServiceOrders } from './pages/ServiceOrders';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { Contractors } from './pages/Contractors';
import { Contracts } from './pages/Contracts';
import { Measurements } from './pages/Measurements';
import { InternalRequests } from './pages/InternalRequests';
import { Quotations } from './pages/Quotations';
import { Users } from './pages/Users';
import { ContractTracking } from './pages/ContractTracking';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sites" element={<Sites />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/service-orders" element={<ServiceOrders />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/contractors" element={<Contractors />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/measurements" element={<Measurements />} />
            <Route path="/internal-requests" element={<InternalRequests />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/contract-tracking" element={<ContractTracking />} />
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
