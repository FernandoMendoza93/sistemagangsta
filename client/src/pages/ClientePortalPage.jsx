import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { citasService, loyaltyService } from '../services/api';
import Swal from 'sweetalert2';
import Icon from '../components/Icon';
import { Scanner } from '@yudiel/react-qr-scanner';
import './ClientePortalPage.css';

export default function ClientePortalPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [perfil, setPerfil] = useState(null);
    const [citas, setCitas] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [barberos, setBarberos] = useState([]);
    const [showAgendarModal, setShowAgendarModal] = useState(false);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [citaForm, setCitaForm] = useState({ id_servicio: '', id_barbero: '1', fecha: '', hora: '', notas: '' });
    const [loading, setLoading] = useState(true);
    const [horasOcupadas, setHorasOcupadas] = useState([]);
    const [horarioLaboral, setHorarioLaboral] = useState(null);

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

    // --- LÓGICA DEL ESCÁNER DE SELLOS ---
    const handleStampClick = (index) => {
        const puntos = perfil?.puntos_lealtad || 0;
        const currentStamps = puntos % 10;

        // Solo el siguiente sello vacío es clickeable
        if (index === currentStamps) {
            Swal.fire({
                title: '¿Canjear visita actual?',
                text: "Abre la cámara para escanear el código QR del barbero",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#c9a227',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, abrir cámara',
                cancelButtonText: 'Cancelar',
                background: '#1a1a2e',
                color: '#fff'
            }).then((result) => {
                if (result.isConfirmed) {
                    setShowScannerModal(true);
                }
            });
        }
    };

    const handleScan = async (detectedCodes) => {
        if (detectedCodes && detectedCodes.length > 0) {
            const qrValue = detectedCodes[0].rawValue;
            setShowScannerModal(false); // Cerrar cámara inmediatamente

            // Extraer token de la URL si es que escaneó una ruta completa
            const match = qrValue.match(/\/sello\/(.+)$/);
            const tokenToClaim = match ? match[1] : qrValue;

            Swal.fire({
                title: 'Reclamando sello...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                await loyaltyService.claim(tokenToClaim);
                Swal.fire({
                    icon: 'success',
                    title: '¡Sello Reclamado! 🎉',
                    text: 'Se ha agregado un punto a tu tarjeta',
                    timer: 2500,
                    showConfirmButton: false,
                    background: '#1a1a2e',
                    color: '#fff'
                });
                loadData(); // Recargar el perfil para mostrar el nuevo sello
            } catch (err) {
                const data = err.response?.data;
                let errorMsg = 'Error al reclamar sello';
                if (data?.expired) errorMsg = 'Este QR ya expiró ⏰';
                else if (data?.already_used) errorMsg = 'Este QR ya fue canjeado ✅';
                else if (data?.error) errorMsg = data.error;

                Swal.fire({
                    icon: 'error',
                    title: 'No se pudo canjear',
                    text: errorMsg,
                    background: '#1a1a2e',
                    color: '#fff'
                });
            }
        }
    };
    // ------------------------------------

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
    async function handleFechaChange(fecha) {
        setCitaForm({ ...citaForm, fecha, hora: '' }); // Limpia la hora si cambia de día
        if (!fecha) {
            setHorasOcupadas([]);
            setHorarioLaboral(null);
            return;
        }

        try {
            // El id_barbero por defecto es 1 (Fernando Mendoza)
            const res = await citasService.getDisponibilidad(fecha, 1);
            setHorasOcupadas(res.data.ocupadas || []);
            setHorarioLaboral(res.data.horario || null);
        } catch (error) {
            console.error('Error obteniendo disponibilidad:', error);
            setHorasOcupadas([]);
            setHorarioLaboral(null);
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

    // Funciones para Calendario Dinámico (Tetris)
    function generarSlots() {
        if (!citaForm.fecha || !citaForm.id_servicio || !horarioLaboral) return [];

        const servicio = servicios.find(s => s.id === parseInt(citaForm.id_servicio));
        if (!servicio) return [];

        const duracionTotal = servicio.duracion_aprox + 15; // duración + 15 min colchón

        const slots = [];
        let [curH, curM] = horarioLaboral.apertura.split(':').map(Number);
        const [endH, endM] = horarioLaboral.cierre.split(':').map(Number);

        const endMinutesOfDay = endH * 60 + endM;

        while ((curH * 60 + curM) + duracionTotal <= endMinutesOfDay) {
            const slotStartStr = `${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;
            const slotEndMins = (curH * 60 + curM) + duracionTotal;
            const slotEndStr = `${String(Math.floor(slotEndMins / 60)).padStart(2, '0')}:${String(slotEndMins % 60).padStart(2, '0')}`;

            // Comprobar solapamiento
            let solapa = false;
            for (const oc of horasOcupadas) {
                // Solapamiento verdadero: A_inicio < B_fin y A_fin > B_inicio
                if (slotStartStr < oc.fin && slotEndStr > oc.inicio) {
                    solapa = true;
                    break;
                }
            }

            if (!solapa) {
                slots.push(slotStartStr);
            }

            // Avanzamos 15 minutos para la siguiente opción dinámica
            curM += 15;
            if (curM >= 60) {
                curH += 1;
                curM -= 60;
            }
        }

        return slots;
    }

    const horasDisponibles = generarSlots();

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
                    {[...Array(maxStamps)].map((_, i) => {
                        const isNextEmpty = i === currentStamps;
                        return (
                            <div
                                key={i}
                                className={`stamp-circle ${i < currentStamps ? 'filled' : ''} ${isNextEmpty ? 'next-stamp' : ''}`}
                                onClick={() => isNextEmpty ? handleStampClick(i) : null}
                                style={{ cursor: isNextEmpty ? 'pointer' : 'default' }}
                            >
                                {i < currentStamps ? (
                                    <Icon name="scissors" size={18} color="#0a0a1a" />
                                ) : i === maxStamps - 1 ? (
                                    <span className="stamp-gift">🎁</span>
                                ) : (
                                    <span className="stamp-number">{i + 1}</span>
                                )}
                            </div>
                        );
                    })}
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
                                            onClick={() => {
                                                setCitaForm({ ...citaForm, id_servicio: s.id, fecha: '', hora: '' });
                                                setHorarioLaboral(null);
                                                setHorasOcupadas([]);
                                            }}
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
                                    onChange={(e) => handleFechaChange(e.target.value)}
                                    min={getMinDate()}
                                    required
                                />
                            </div>

                            {/* Hora */}
                            <div className="portal-form-group">
                                <label>🕐 Hora</label>
                                <div className="time-chips">
                                    {(!citaForm.fecha || !citaForm.id_servicio) ? (
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                            Selecciona el servicio y la fecha primero para ver los espacios.
                                        </p>
                                    ) : horasDisponibles.length === 0 ? (
                                        <p style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>
                                            No hay espacios disponibles para este servicio hoy.
                                        </p>
                                    ) : (
                                        horasDisponibles.map(hora => (
                                            <button
                                                key={hora}
                                                type="button"
                                                className={`time-chip ${citaForm.hora === hora ? 'selected' : ''}`}
                                                onClick={() => setCitaForm({ ...citaForm, hora })}
                                            >
                                                {hora}
                                            </button>
                                        ))
                                    )}
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
                        {/* Modal Scanner QR - FINISH */}
                    </div>
                </div>
            )}

            {/* Modal Scanner QR */}
            {showScannerModal && (
                <div className="portal-modal-overlay" onClick={() => setShowScannerModal(false)}>
                    <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="portal-modal-header">
                            <h3>📸 Escanear Visita</h3>
                            <button onClick={() => setShowScannerModal(false)}>
                                <Icon name="x-lg" />
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                Apunta la cámara al QR que te muestra el barbero.
                            </p>

                            <div style={{
                                borderRadius: '16px',
                                overflow: 'hidden',
                                border: '2px solid rgba(201, 162, 39, 0.3)',
                                backgroundColor: '#000',
                                marginBottom: '1.5rem'
                            }}>
                                <Scanner
                                    onScan={handleScan}
                                    formats={['qr_code']}
                                    components={{
                                        audio: false,
                                        finder: true,
                                    }}
                                />
                            </div>

                            <button
                                className="portal-submit-btn"
                                style={{ width: '100%', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                                onClick={() => setShowScannerModal(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
