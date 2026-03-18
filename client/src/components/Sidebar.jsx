import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, NavLink } from 'react-router-dom';

export default function Sidebar({ isOpen, onToggle }) {
    const { user, logout, isAdmin, isEncargado } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNavClick = () => {
        if (window.innerWidth <= 834) {
            onToggle?.(false);
        }
    };

    // Dynamic tenant identity
    const barberiaName = user?.barberia_nombre || 'Mi Barberia';
    const logoUrl = user?.logo_url || null;

    // Generate initials for avatar fallback
    const initials = barberiaName
        .split(' ')
        .map(w => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    return (
        <>
            <button
                className="sidebar-toggle"
                onClick={() => onToggle?.(!isOpen)}
                aria-label="Menu"
            >
                <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
            </button>

            <div
                className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
                onClick={() => onToggle?.(false)}
            />

            <aside 
                className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${theme?.clase_glass || ''}`}
                style={{ 
                    backgroundColor: 'var(--bg-surface)', 
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-main)'
                }}
            >
                <div className="sidebar-overlay"></div>
                <div className="sidebar-content">
                    <div className="sidebar-header" style={{ backgroundColor: 'transparent', borderBottomColor: 'var(--glass-border)' }}>
                        <div className="sidebar-logo">
                            {logoUrl ? (
                                <img src={logoUrl} alt={barberiaName} className="sidebar-logo-img" style={{ borderColor: 'var(--accent-primary)' }} />
                            ) : (
                                <div className="sidebar-logo-initials" style={{ background: 'var(--gradient-gold)' }}>{initials}</div>
                            )}
                        </div>
                        <h1 className="sidebar-brand" style={{ color: 'var(--text-main)' }}>{barberiaName}</h1>
                        <p className="sidebar-tagline" style={{ color: 'var(--text-muted)' }}>Panel de Gestion</p>
                    </div>

                    <nav className="sidebar-nav">
                        <div className="nav-section-title" style={{ color: 'var(--accent-primary)' }}>Principal</div>

                        <NavLink to="/panel" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                            <i className="bi bi-speedometer2"></i>
                            <span>Dashboard</span>
                        </NavLink>

                        <NavLink to="/panel/pos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                            <i className="bi bi-shop"></i>
                            <span>Punto de Venta</span>
                        </NavLink>

                        <NavLink to="/panel/ventas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                            <i className="bi bi-receipt"></i>
                            <span>Ventas del Dia</span>
                        </NavLink>

                        <NavLink to="/panel/citas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                            <i className="bi bi-calendar-check"></i>
                            <span>Citas</span>
                        </NavLink>

                        <NavLink to="/panel/scanner" className={({ isActive }) => `nav-item scan-btn-nav ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                            <i className="bi bi-qr-code-scan"></i>
                            <span>Escanear Wallet</span>
                        </NavLink>

                        {isEncargado() && (
                            <>
                                <div className="nav-section-title">Gestion</div>

                                <NavLink to="/panel/inventario" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-box-seam"></i>
                                    <span>Inventario</span>
                                </NavLink>

                                <NavLink to="/panel/corte-caja" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-cash-stack"></i>
                                    <span>Corte de Caja</span>
                                </NavLink>

                                <NavLink to="/panel/reportes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-graph-up-arrow"></i>
                                    <span>Reportes</span>
                                </NavLink>

                                <NavLink to="/panel/clientes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-people-fill"></i>
                                    <span>Clientes</span>
                                </NavLink>
                            </>
                        )}

                        {isAdmin() && (
                            <>
                                <div className="nav-section-title">Administracion</div>

                                <NavLink to="/panel/servicios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-scissors"></i>
                                    <span>Servicios</span>
                                </NavLink>

                                <NavLink to="/panel/personal" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-people"></i>
                                    <span>Personal</span>
                                </NavLink>

                                <NavLink to="/panel/horarios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-clock-history"></i>
                                    <span>Horarios</span>
                                </NavLink>

                                <NavLink to="/panel/comisiones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-gem"></i>
                                    <span>Comisiones</span>
                                </NavLink>

                                <NavLink to="/panel/configuracion" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-qr-code"></i>
                                    <span>Configuración</span>
                                </NavLink>
                            </>
                        )}
                    </nav>

                    <div className="sidebar-footer" style={{ borderTopColor: 'var(--glass-border)', backgroundColor: 'transparent' }}>
                        <div className="user-info" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--glass-border)' }}>
                            <div className="user-avatar" style={{ backgroundColor: 'rgba(var(--accent-primary-rgb, 255, 95, 64), 0.1)', color: 'var(--accent-primary)' }}>
                                <i className="bi bi-person-fill"></i>
                            </div>
                            <div className="user-details">
                                <div className="user-name" style={{ color: 'var(--text-main)' }}>{user?.nombre}</div>
                                <div className="user-role" style={{ color: 'var(--accent-primary)' }}>
                                    <i className="bi bi-shield-check me-1"></i>
                                    {user?.rol}
                                </div>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="btn-logout">
                            <i className="bi bi-box-arrow-left me-2"></i>
                            Cerrar Sesion
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
