import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import VentasPage from './pages/VentasPage';
import CitasPage from './pages/CitasPage';
import InventarioPage from './pages/InventarioPage';
import CorteCajaPage from './pages/CorteCajaPage';
import ReportesPage from './pages/ReportesPage';
import PersonalPage from './pages/PersonalPage';
import ServiciosPage from './pages/ServiciosPage';
import ComisionesPage from './pages/ComisionesPage';
import ClientesPage from './pages/ClientesPage';
import ClienteLoginPage from './pages/ClienteLoginPage';
import ClientePortalPage from './pages/ClientePortalPage';
import ClaimPointPage from './pages/ClaimPointPage';
import bodyBg from './assets/body-bg.jpg';
import './index.css';

// Layout con Sidebar
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const appStyle = {
    backgroundImage: `url(${bodyBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
  };

  return (
    <div className="app-container" style={appStyle}>
      <div className="app-overlay"></div>
      <Sidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

// Ruta protegida (solo staff — bloquea Cliente)
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Cliente NUNCA puede acceder al panel admin
  if (user.rol === 'Cliente') {
    return <Navigate to="/mi-perfil/portal" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  function ClienteProtectedRoute({ children }) {
    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    if (!user || user.rol !== 'Cliente') return <Navigate to="/mi-perfil" replace />;
    return children;
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={
        user
          ? <Navigate to={user.rol === 'Cliente' ? '/mi-perfil/portal' : '/'} replace />
          : <LoginPage />
      } />

      {/* Portal del Cliente — rutas independientes sin sidebar */}
      <Route path="/mi-perfil" element={<ClienteLoginPage />} />
      <Route path="/mi-perfil/portal" element={
        <ClienteProtectedRoute><ClientePortalPage /></ClienteProtectedRoute>
      } />
      <Route path="/mi-perfil/sello/:token" element={<ClaimPointPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pos" element={<POSPage />} />
        <Route path="/ventas" element={<VentasPage />} />
        <Route path="/citas" element={<CitasPage />} />

        {/* Rutas para Encargado y Admin */}
        <Route path="/inventario" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado']}><InventarioPage /></ProtectedRoute>
        } />
        <Route path="/corte-caja" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado']}><CorteCajaPage /></ProtectedRoute>
        } />
        <Route path="/reportes" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado']}><ReportesPage /></ProtectedRoute>
        } />
        <Route path="/clientes" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado']}><ClientesPage /></ProtectedRoute>
        } />

        {/* Rutas solo Admin */}
        <Route path="/servicios" element={
          <ProtectedRoute allowedRoles={['Admin']}><ServiciosPage /></ProtectedRoute>
        } />
        <Route path="/personal" element={
          <ProtectedRoute allowedRoles={['Admin']}><PersonalPage /></ProtectedRoute>
        } />
        <Route path="/comisiones" element={
          <ProtectedRoute allowedRoles={['Admin']}><ComisionesPage /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
