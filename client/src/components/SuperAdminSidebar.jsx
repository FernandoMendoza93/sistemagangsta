import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scissors, Store, DollarSign, Settings, LogOut, Shield, User } from 'lucide-react';
import './SuperAdminSidebar.css';

export default function SuperAdminSidebar({ isOpen, onToggle }) {
    const { user, logout } = useAuth();
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

    return (
        <>
            <button
                className="sa-sidebar-toggle"
                onClick={() => onToggle?.(!isOpen)}
                aria-label="Menu"
            >
                {isOpen ? <span>&times;</span> : <span>&#9776;</span>}
            </button>

            <div
                className={`sa-sidebar-backdrop ${isOpen ? 'active' : ''}`}
                onClick={() => onToggle?.(false)}
            />

            <aside className={`sa-sidebar ${isOpen ? 'sa-sidebar-open' : ''}`}>
                {/* Brand */}
                <div className="sa-sidebar-header">
                    <div className="sa-sidebar-brand">
                        <div className="sa-brand-icon">
                            <Scissors size={20} color="#FF6B4A" strokeWidth={1.5} />
                        </div>
                        <div className="sa-brand-text">
                            <h1>Flow</h1>
                            <p>Control Panel</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sa-sidebar-nav">
                    <div className="sa-nav-section">Gestion</div>

                    <NavLink to="/admin/barberias" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                        <Store size={18} />
                        <span>Barberias</span>
                    </NavLink>

                    <NavLink to="/admin/finanzas" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                        <DollarSign size={18} />
                        <span>Finanzas Globales</span>
                    </NavLink>

                    <div className="sa-nav-section">Sistema</div>

                    <NavLink to="/admin/configuracion" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
                        <Settings size={18} />
                        <span>Configuracion</span>
                    </NavLink>
                </nav>

                {/* Footer */}
                <div className="sa-sidebar-footer">
                    <div className="sa-user-info">
                        <div className="sa-user-avatar">
                            <User size={18} color="#FF6B4A" />
                        </div>
                        <div>
                            <div className="sa-user-name">{user?.nombre}</div>
                            <div className="sa-user-role">Super Admin</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="sa-btn-logout">
                        <LogOut size={16} /> Cerrar Sesion
                    </button>
                </div>
            </aside>
        </>
    );
}
