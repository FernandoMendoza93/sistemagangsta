import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import sidebarBg from '../assets/sidebar-bg.jpg';

export default function Sidebar({ isOpen, onToggle }) {
    const { user, logout, isAdmin, isEncargado } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNavClick = () => {
        // Cerrar sidebar en tablet/mobile al navegar
        if (window.innerWidth <= 834) {
            onToggle?.(false);
        }
    };

    const sidebarStyle = {
        backgroundImage: `url(${sidebarBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    };

    return (
        <>
            {/* Botón hamburguesa — solo visible en tablet/mobile vía CSS */}
            <button
                className="sidebar-toggle"
                onClick={() => onToggle?.(!isOpen)}
                aria-label="Menú"
            >
                <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
            </button>

            {/* Backdrop para cerrar sidebar al tocar fuera */}
            <div
                className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
                onClick={() => onToggle?.(false)}
            />

            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} style={sidebarStyle}>
                <div className="sidebar-overlay"></div>
                <div className="sidebar-content">
                    <div className="sidebar-header">
                        <div className="sidebar-logo">
                            <img src={logo} alt="The Gangsta Barber Shop" className="sidebar-logo-img" />
                        </div>
                        <h1 className="sidebar-brand">The Gangsta</h1>
                        <p className="sidebar-tagline">Barber Shop</p>
                    </div>

                    <nav className="sidebar-nav">
                        <div className="nav-section-title">Principal</div>

                        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                            <i className="bi bi-speedometer2"></i>
                            <span>Dashboard</span>
                        </NavLink>

                        <NavLink to="/pos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                            <i className="bi bi-shop"></i>
                            <span>Punto de Venta</span>
                        </NavLink>

                        <NavLink to="/ventas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                            <i className="bi bi-receipt"></i>
                            <span>Ventas del Día</span>
                        </NavLink>

                        {isEncargado() && (
                            <>
                                <div className="nav-section-title">Gestión</div>

                                <NavLink to="/inventario" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-box-seam"></i>
                                    <span>Inventario</span>
                                </NavLink>

                                <NavLink to="/corte-caja" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-cash-stack"></i>
                                    <span>Corte de Caja</span>
                                </NavLink>

                                <NavLink to="/reportes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-graph-up-arrow"></i>
                                    <span>Reportes</span>
                                </NavLink>

                                <NavLink to="/clientes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-people-fill"></i>
                                    <span>Clientes</span>
                                </NavLink>
                            </>
                        )}

                        {isAdmin() && (
                            <>
                                <div className="nav-section-title">Administración</div>

                                <NavLink to="/servicios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-scissors"></i>
                                    <span>Servicios</span>
                                </NavLink>

                                <NavLink to="/personal" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-people"></i>
                                    <span>Personal</span>
                                </NavLink>

                                <NavLink to="/comisiones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                                    <i className="bi bi-gem"></i>
                                    <span>Comisiones</span>
                                </NavLink>
                            </>
                        )}
                    </nav>

                    <div className="sidebar-footer">
                        <div className="user-info">
                            <div className="user-avatar">
                                <i className="bi bi-person-fill"></i>
                            </div>
                            <div className="user-details">
                                <div className="user-name">{user?.nombre}</div>
                                <div className="user-role">
                                    <i className="bi bi-shield-check me-1"></i>
                                    {user?.rol}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="btn-logout"
                        >
                            <i className="bi bi-box-arrow-left me-2"></i>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
