import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificacionesService } from '../services/api';
import { subscribeToEvent, unsubscribeFromEvent, getSocket } from '../services/socket';
import { Bell, Check, CheckCheck, Calendar, Clock, User } from 'lucide-react';
import './NotificationBell.css';

export default function NotificationBell() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notificaciones, setNotificaciones] = useState([]);
    const [sinLeer, setSinLeer] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Cargar notificaciones al montar
    useEffect(() => {
        if (!user || user.rol === 'Cliente') return;
        loadNotificaciones();

        // Recargar cada 60s
        const interval = setInterval(loadNotificaciones, 60000);
        return () => clearInterval(interval);
    }, [user]);

    // Escuchar nuevas citas via WebSocket de forma segura sin borrar listeners globales
    const bellListenerRef = useRef(null);
    useEffect(() => {
        if (!user || user.rol === 'Cliente') return;
        const sock = getSocket();
        if (!sock) return;

        // Callback especifico
        bellListenerRef.current = () => {
            setTimeout(loadNotificaciones, 1000);
        };
        sock.on('NUEVA_CITA', bellListenerRef.current);

        return () => {
            if (sock && bellListenerRef.current) {
                // Borrar SOLO este callback
                sock.off('NUEVA_CITA', bellListenerRef.current);
            }
        };
    }, [user]);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotificaciones = async () => {
        try {
            const res = await notificacionesService.getAll();
            setNotificaciones(res.data.notificaciones || []);
            setSinLeer(res.data.sin_leer || 0);
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
        }
    };

    const handleNotificacionClick = async (notif) => {
        // Marcar como leída
        if (!notif.leido) {
            try {
                await notificacionesService.marcarLeida(notif.id);
                setSinLeer(prev => Math.max(0, prev - 1));
                setNotificaciones(prev =>
                    prev.map(n => n.id === notif.id ? { ...n, leido: 1 } : n)
                );
            } catch (err) {
                console.error('Error marcando notificación:', err);
            }
        }

        setIsOpen(false);

        // Navegar al calendario con la fecha de la cita
        if (notif.cita_fecha) {
            navigate(`/panel/citas?fecha=${notif.cita_fecha}`);
        }
    };

    const handleMarcarTodas = async () => {
        try {
            await notificacionesService.marcarTodasLeidas();
            setSinLeer(0);
            setNotificaciones(prev => prev.map(n => ({ ...n, leido: 1 })));
        } catch (err) {
            console.error('Error marcando todas:', err);
        }
    };

    const formatFechaRelativa = (fecha) => {
        const now = new Date();
        const notifDate = new Date(fecha);
        const diffMs = now - notifDate;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Ahora';
        if (diffMin < 60) return `Hace ${diffMin}m`;
        if (diffHrs < 24) return `Hace ${diffHrs}h`;
        if (diffDays === 1) return 'Ayer';
        return `Hace ${diffDays}d`;
    };

    // No renderizar para clientes
    if (!user || user.rol === 'Cliente') return null;

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button
                className="notification-bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notificaciones"
            >
                <Bell size={20} />
                {sinLeer > 0 && (
                    <span className="notification-badge">{sinLeer > 9 ? '9+' : sinLeer}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                        <h4>Notificaciones</h4>
                        {sinLeer > 0 && (
                            <button
                                className="notification-mark-all"
                                onClick={handleMarcarTodas}
                                title="Marcar todas como leídas"
                            >
                                <CheckCheck size={16} />
                                Leer todas
                            </button>
                        )}
                    </div>

                    <div className="notification-dropdown-body">
                        {notificaciones.length === 0 ? (
                            <div className="notification-empty">
                                <Calendar size={32} style={{ opacity: 0.3 }} />
                                <p>¡Todo al día!</p>
                                <span>No hay citas nuevas en los últimos 7 días</span>
                            </div>
                        ) : (
                            notificaciones.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`notification-item ${!notif.leido ? 'unread' : ''}`}
                                    onClick={() => handleNotificacionClick(notif)}
                                >
                                    <div className="notification-item-icon">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="notification-item-content">
                                        <div className="notification-item-text">
                                            {notif.cliente_nombre && (
                                                <strong>{notif.cliente_nombre}</strong>
                                            )}
                                            {' '}agendó una cita
                                        </div>
                                        {notif.cita_fecha && (
                                            <div className="notification-item-meta">
                                                <span><Calendar size={12} /> {notif.cita_fecha}</span>
                                                {notif.cita_hora && <span><Clock size={12} /> {notif.cita_hora}</span>}
                                            </div>
                                        )}
                                        <div className="notification-item-time">
                                            {formatFechaRelativa(notif.fecha_creacion)}
                                        </div>
                                    </div>
                                    {!notif.leido && <div className="notification-item-dot" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
