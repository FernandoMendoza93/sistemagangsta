import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { citasService } from '../services/api';
import Swal from 'sweetalert2';
import Icon from '../components/Icon';
import './ClientePortalPage.css';

export default function ClientePortalPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [perfil, setPerfil] = useState(null);
    const [citas, setCitas] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [barberos, setBarberos] = useState([]);
    const [showAgendarModal, setShowAgendarModal] = useState(false);
    const [citaForm, setCitaForm] = useState({ id_servicio: '', id_barbero: '', fecha: '', hora: '', notas: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [perfilRes, citasRes] = await Promise.all([
                citasService.getMiPerfil(),
                citasService.getMisCitas()
            ]);
            setPerfil(perfilRes.data);
            setCitas(citasRes.data);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    }

    async function openAgendarModal() {
        try {
            const [servRes, barbRes] = await Promise.all([
                citasService.getServiciosActivos(),
                citasService.getBarberos()
            ]);
            setServicios(servRes.data);
            setBarberos(barbRes.data);
        } catch (error) {
            console.error('Error cargando servicios/barberos:', error);
        }
        setCitaForm({ id_servicio: '', id_barbero: '', fecha: '', hora: '', notas: '' });
        setShowAgendarModal(true);
    }

    async function handleAgendarCita(e) {
        e.preventDefault();
        try {
            await citasService.crear(citaForm);
            Swal.fire({
                icon: 'success',
                title: '¡Cita agendada! 💈',
                text: 'Te esperamos, no llegues tarde',
                timer: 2500,
                showConfirmButton: false
            });
            setShowAgendarModal(false);
            loadData();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.error || 'No se pudo agendar' });
        }
    }

    function handleLogout() {
        logout();
        navigate('/mi-perfil');
    }

    function openWhatsApp() {
        const message = encodeURIComponent(
            `¡Hola! Soy ${user?.nombre}, tengo una duda sobre mi cita en The Gangsta Barber Shop 💈`
        );
        // Número de la barbería (puedes configurar esto)
        window.open(`https://wa.me/529511955349?text=${message}`, '_blank');
    }

    const puntos = perfil?.puntos_lealtad || 0;
    const maxStamps = 10;
    const currentStamps = puntos % maxStamps;
    const completedCards = Math.floor(puntos / maxStamps);
    const remaining = maxStamps - currentStamps;

    function getMinDate() {
        return new Date().toISOString().split('T')[0];
    }

    const horasDisponibles = [
        '09:00', '10:00', '11:00',
        '12:00', '13:00', '14:00',
        '15:00', '16:00', '17:00',
        '18:00', '19:00', '20:00'
    ];

    if (loading) {
        return (
            <div className="portal-loading">
                <div className="cliente-spinner"></div>
            </div>
        );
    }

    return (
        <div className="cliente-portal">
            {/* Header */}
            <div className="portal-header">
                <div className="portal-header-top">
                    <div className="portal-brand">
                        <Icon name="scissors" size={20} color="#c9a227" />
                        <span>The Gangsta</span>
                    </div>
                    <button className="portal-logout" onClick={handleLogout}>
                        <Icon name="box-arrow-left" /> Salir
                    </button>
                </div>
                <div className="portal-greeting">
                    <h1>¡Qué onda, {user?.nombre?.split(' ')[0]}! 💈</h1>
                    <p>
                        {remaining > 0
                            ? `Estás a ${remaining} corte${remaining > 1 ? 's' : ''} de tu regalo 🎁`
                            : '¡Tienes un corte gratis! 🎉'
                        }
                    </p>
                </div>
            </div>

            {/* Loyalty Card */}
            <div className="loyalty-card">
                <div className="loyalty-card-header">
                    <span>🏆 Tarjeta de Fidelidad</span>
                    {completedCards > 0 && (
                        <span className="loyalty-badge">🎉 {completedCards} completada{completedCards > 1 ? 's' : ''}</span>
                    )}
                </div>
                <div className="stamps-grid">
                    {[...Array(maxStamps)].map((_, i) => (
                        <div key={i} className={`stamp-circle ${i < currentStamps ? 'filled' : ''}`}>
                            {i < currentStamps ? (
                                <Icon name="scissors" size={18} color="#0a0a1a" />
                            ) : i === maxStamps - 1 ? (
                                <span className="stamp-gift">🎁</span>
                            ) : (
                                <span className="stamp-number">{i + 1}</span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="loyalty-progress">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(currentStamps / maxStamps) * 100}%` }}></div>
                    </div>
                    <span className="progress-text">{currentStamps}/{maxStamps} sellos</span>
                </div>
                {currentStamps === 0 && completedCards > 0 && (
                    <div className="loyalty-redeem">
                        <button className="redeem-btn" onClick={openWhatsApp}>
                            🎁 Canjear Corte Gratis
                        </button>
                    </div>
                )}
            </div>

            {/* Citas Section */}
            <div className="portal-section">
                <div className="section-header">
                    <h2>📅 Mis Citas</h2>
                </div>
                {citas.length === 0 ? (
                    <div className="empty-citas">
                        <p>No tienes citas agendadas</p>
                        <p className="empty-hint">Agenda tu próxima visita 👇</p>
                    </div>
                ) : (
                    <div className="citas-list">
                        {citas.filter(c => c.estado !== 'Cancelada').slice(0, 5).map(cita => (
                            <div key={cita.id} className={`cita-card cita-${cita.estado.toLowerCase()}`}>
                                <div className="cita-date">
                                    <div className="cita-day">{new Date(cita.fecha + 'T00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}</div>
                                    <div className="cita-month">{new Date(cita.fecha + 'T00:00').toLocaleDateString('es-MX', { month: 'short' })}</div>
                                </div>
                                <div className="cita-info">
                                    <strong>{cita.nombre_servicio || 'Servicio general'}</strong>
                                    <span>{cita.hora} hrs {cita.barbero_nombre ? `· ${cita.barbero_nombre}` : ''}</span>
                                </div>
                                <div className={`cita-status status-${cita.estado.toLowerCase()}`}>
                                    {cita.estado}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="portal-bottom-actions">
                <button className="bottom-btn btn-wa" onClick={openWhatsApp}>
                    <Icon name="whatsapp" /> WhatsApp
                </button>
                <button className="bottom-btn btn-agendar" onClick={openAgendarModal}>
                    <Icon name="calendar-plus" /> Agendar
                </button>
            </div>

            {/* Modal Agendar */}
            {showAgendarModal && (
                <div className="portal-modal-overlay" onClick={() => setShowAgendarModal(false)}>
                    <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="portal-modal-header">
                            <h3>📅 Agendar Cita</h3>
                            <button onClick={() => setShowAgendarModal(false)}>
                                <Icon name="x-lg" />
                            </button>
                        </div>
                        <form onSubmit={handleAgendarCita} className="portal-modal-form">
                            {/* Servicio */}
                            <div className="portal-form-group">
                                <label>¿Qué te hacemos?</label>
                                <div className="service-chips">
                                    {servicios.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            className={`service-chip ${citaForm.id_servicio == s.id ? 'selected' : ''}`}
                                            onClick={() => setCitaForm({ ...citaForm, id_servicio: s.id })}
                                        >
                                            {s.nombre_servicio} · ${s.precio}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Barbero fijo */}
                            <div className="portal-form-group">
                                <label>✂️ Con Fernando Mendoza</label>
                            </div>

                            {/* Fecha */}
                            <div className="portal-form-group">
                                <label>📆 Fecha</label>
                                <input
                                    type="date"
                                    value={citaForm.fecha}
                                    onChange={(e) => setCitaForm({ ...citaForm, fecha: e.target.value })}
                                    min={getMinDate()}
                                    required
                                />
                            </div>

                            {/* Hora */}
                            <div className="portal-form-group">
                                <label>🕐 Hora</label>
                                <div className="time-chips">
                                    {horasDisponibles.map(hora => (
                                        <button
                                            key={hora}
                                            type="button"
                                            className={`time-chip ${citaForm.hora === hora ? 'selected' : ''}`}
                                            onClick={() => setCitaForm({ ...citaForm, hora })}
                                        >
                                            {hora}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notas */}
                            <div className="portal-form-group">
                                <label>📝 Notas (opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Algo especial que quieras..."
                                    value={citaForm.notas}
                                    onChange={(e) => setCitaForm({ ...citaForm, notas: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="portal-submit-btn" disabled={!citaForm.fecha || !citaForm.hora}>
                                Confirmar Cita 💈
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
