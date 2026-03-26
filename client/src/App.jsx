import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import SuperAdminSidebar from './components/SuperAdminSidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SuperAdminPage from './pages/SuperAdminPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import VentasPage from './pages/VentasPage';
import CitasPage from './pages/CitasPage';
import InventarioPage from './pages/InventarioPage';
import HorariosPage from './pages/HorariosPage';
import CorteCajaPage from './pages/CorteCajaPage';
import ReportesPage from './pages/ReportesPage';
import PersonalPage from './pages/PersonalPage';
import ServiciosPage from './pages/ServiciosPage';
import ComisionesPage from './pages/ComisionesPage';
import ClientesPage from './pages/ClientesPage';
import ClienteLoginPage from './pages/ClienteLoginPage';
import ClientePortalPage from './pages/ClientePortalPage';
import ClaimPointPage from './pages/ClaimPointPage';
import ScannerPage from './pages/ScannerPage';
import RegisterPage from './pages/RegisterPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import { Toaster } from 'sonner';
import './index.css';

// ============================================
// LAYOUT: SuperAdmin (Flow Control)
// Dark background, Flow branding, separate sidebar
// ============================================
function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="sa-layout">
      <SuperAdminSidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />
      <main className="sa-main-content">
        <Outlet />
      </main>
    </div>
  );
}

// ============================================
// LAYOUT: Barber Business (El Producto)
// White background, dynamic tenant branding
// ============================================
function BarberLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container barber-layout">
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

  if (user.rol === 'Cliente') {
    return <Navigate to="/mi-perfil/portal" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/panel" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  // Dynamic Page Title
  useEffect(() => {
    if (user?.barberia_nombre) {
      document.title = `${user.barberia_nombre} | Flow System`;
    } else if (user?.rol === 'SuperAdmin') {
      document.title = `Flow Admin | Flow System`;
    } else {
      document.title = `Flow Barber System`;
    }
  }, [user]);

  // Auto-Logout por Inactividad (15 minutos)
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        if (user.rol === 'Cliente') {
            const currentPath = window.location.pathname;
            if (currentPath.startsWith('/portal/')) {
                const matchedSlug = currentPath.split('/')[2];
                navigate(`/portal/${matchedSlug}`);
            } else {
                navigate('/mi-perfil');
            }
        } else {
            navigate('/login');
        }
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, logout, navigate]);

  function ClienteProtectedRoute({ children }) {
    const location = useLocation();
    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    
    if (!user || user.rol !== 'Cliente') {
        if (location.pathname.startsWith('/portal/')) {
            const matchedSlug = location.pathname.split('/')[2];
            return <Navigate to={`/portal/${matchedSlug}`} replace />;
        }
        return <Navigate to="/mi-perfil" replace />;
    }
    return children;
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  // Helper to get redirect path after login
  function getRedirectPath() {
    if (!user) return '/';
    if (user.rol === 'SuperAdmin') return '/admin/barberias';
    if (user.rol === 'Cliente') return '/mi-perfil/portal';
    return '/panel';
  }

  return (
    <Routes>
      {/* ====== PUBLIC ====== */}
      <Route path="/" element={user ? <Navigate to={getRedirectPath()} replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={getRedirectPath()} replace /> : <LoginPage />} />
      <Route path="/registrar" element={user ? <Navigate to={getRedirectPath()} replace /> : <RegisterPage />} />

      {/* ====== CLIENT PORTAL (no sidebar) ====== */}
      {/* Ruta dinámica por slug de barbería */}
      <Route path="/portal/:slug" element={<ClienteLoginPage />} />
      <Route path="/portal/:slug/panel" element={
        <ClienteProtectedRoute><ClientePortalPage /></ClienteProtectedRoute>
      } />
      <Route path="/portal/:slug/sello/:token" element={<ClaimPointPage />} />
      {/* Compatibilidad legada — redirige si el usuario ya tiene slug guardado */}
      <Route path="/mi-perfil" element={<ClienteLoginPage />} />
      <Route path="/mi-perfil/portal" element={
        <ClienteProtectedRoute><ClientePortalPage /></ClienteProtectedRoute>
      } />
      <Route path="/mi-perfil/sello/:token" element={<ClaimPointPage />} />

      {/* ====== SUPER ADMIN — Flow Control ====== */}
      <Route element={
        <ProtectedRoute allowedRoles={['SuperAdmin']}>
          <SuperAdminLayout />
        </ProtectedRoute>
      }>
        <Route path="/admin/barberias" element={<SuperAdminPage />} />
        <Route path="/admin/finanzas" element={<SuperAdminPage />} />
        <Route path="/admin/configuracion" element={<SuperAdminPage />} />
      </Route>

      {/* ====== BARBER BUSINESS — El Producto ====== */}
      <Route element={<ProtectedRoute><BarberLayout /></ProtectedRoute>}>
        <Route path="/panel" element={<DashboardPage />} />
        <Route path="/panel/pos" element={<POSPage />} />
        <Route path="/panel/ventas" element={<VentasPage />} />
        <Route path="/panel/citas" element={<CitasPage />} />

        <Route path="/panel/scanner" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado', 'Barbero']}><ScannerPage /></ProtectedRoute>
        } />

        <Route path="/panel/inventario" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado']}><InventarioPage /></ProtectedRoute>
        } />
        <Route path="/panel/corte-caja" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado']}><CorteCajaPage /></ProtectedRoute>
        } />
        <Route path="/panel/reportes" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado']}><ReportesPage /></ProtectedRoute>
        } />
        <Route path="/panel/clientes" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado']}><ClientesPage /></ProtectedRoute>
        } />
        <Route path="/panel/horarios" element={
          <ProtectedRoute allowedRoles={['Admin', 'Encargado']}><HorariosPage /></ProtectedRoute>
        } />

        <Route path="/panel/servicios" element={
          <ProtectedRoute allowedRoles={['Admin']}><ServiciosPage /></ProtectedRoute>
        } />
        <Route path="/panel/personal" element={
          <ProtectedRoute allowedRoles={['Admin']}><PersonalPage /></ProtectedRoute>
        } />
        <Route path="/panel/comisiones" element={
          <ProtectedRoute allowedRoles={['Admin']}><ComisionesPage /></ProtectedRoute>
        } />
        <Route path="/panel/configuracion" element={
          <ProtectedRoute allowedRoles={['Admin']}><ConfiguracionPage /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ThemeApplier({ children }) {
  const { user } = useAuth();
  const { applyTheme, resetTheme } = useTheme();
  const { pathname } = useLocation();

  useEffect(() => {
    const publicRoutes = ['/login', '/registrar', '/'];
    const isPublic = publicRoutes.includes(pathname) || pathname.startsWith('/admin/login');

    if (isPublic) {
      resetTheme();
    } else if (user && user.barberia_id) {
      // Priorizar tema cacheado (se actualiza al cambiar tema en Configuración)
      const cached = localStorage.getItem(`tema_flow_${user.barberia_id}`);
      if (cached) {
        try {
          applyTheme(JSON.parse(cached), user.barberia_id);
        } catch (e) {
          if (user.bg_main) applyTheme(user, user.barberia_id);
        }
      } else if (user.bg_main) {
        applyTheme(user, user.barberia_id);
      }
    }
  }, [user, pathname, applyTheme, resetTheme]);

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ThemeApplier>
            <AppRoutes />
          </ThemeApplier>
          <Toaster
            position="top-right"
            theme="light"
            richColors
            toastOptions={{
              style: {
                fontFamily: "'Inter', sans-serif",
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                border: 'none',
                padding: '14px 20px',
              }
            }}
          />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
