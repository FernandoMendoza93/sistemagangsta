import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { citasService, clientesService } from '../services/api';
import { toast } from 'sonner';
import { Calendar, Clock, Star, User, MessageCircle, PlusCircle, X, Scissors, CheckCircle, Gift, QrCode, Crown, Trophy } from 'lucide-react';
import QRCode from 'react-qr-code';
import heroImg from '../assets/hero-bg.jpg';
import './ClientePortalPage.css';

export default function ClientePortalPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [wallet, setWallet] = useState(null);
    const [citas, setCitas] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [barberos, setBarberos] = useState([]);
    const [showAgendarModal, setShowAgendarModal] = useState(false);
    const [citaForm, setCitaForm] = useState({ id_servicio: '', id_barbero: '1', fecha: '', hora: '', notas: '' });
    const [loading, setLoading] = useState(true);
    const [horasOcupadas, setHorasOcupadas] = useState([]);
    const [horarioLaboral, setHorarioLaboral] = useState(null);

    useEffect(() => {
        loadData();

        // Setup SSE connection for real-time loyalty updates
        const token = localStorage.getItem('token');
        if (!token) return;

        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const sseUrl = `${baseUrl}/loyalty/stream?token=${token}`;

        const source = new EventSource(sseUrl);

        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'STAMP_ADDED') {
                    toast.success('🎉 ' + data.message);
                    loadData(); // Refresh wallet and UI instantly
                }
            } catch (err) {
                console.error("Error parsing SSE data", err);
            }
        };

        source.onerror = (error) => {
            console.error("SSE connection error", error);
            source.close();
        };

        return () => {
            source.close();
        };
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [walletRes, citasRes] = await Promise.all([
                clientesService.getWalletStatus(),
                citasService.getMisCitas()
            ]);
            setWallet(walletRes.data);
            setCitas(citasRes.data);
        } catch (error) {
            console.error('Error cargando datos del wallet o citas:', error.response?.data || error);
            toast.error(error.response?.data?.error || 'Tu sesión expiró o los datos no están disponibles. Por favor, cierra sesión y vuelve a entrar.');
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
            toast.success('¡Cita Agendada! Te esperamos');
            setShowAgendarModal(false);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo agendar');
        }
    }

    async function handleFechaChange(fecha) {
        if (!citaForm.id_servicio) {
            toast.warning('Por favor, selecciona un servicio antes de elegir la fecha.');
            return;
        }

        setCitaForm({ ...citaForm, fecha, hora: '' });
        if (!fecha) {
            setHorasOcupadas([]);
            setHorarioLaboral(null);
            return;
        }

        try {
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

    // --- Loyalty stamps calculations ---
    const sellosActuales = wallet?.sellos_actuales || 0;
    const maxStamps = wallet?.total_requerido || 10;
    const remaining = maxStamps - sellosActuales;

    function getNivelIcon() {
        switch (wallet?.nivel?.toLowerCase()) {
            case 'oro': return <Crown size={16} color="#FCD34D" />;
            case 'plata': return <Trophy size={16} color="#E5E7EB" />;
            default: return <Star size={16} color="#D97706" />;
        }
    }

    // Generar proximos dias disponibles (Viernes, Sabado, Domingo)
    function generarDiasDisponibles() {
        const dias = [];
        const hoy = new Date();
        let fechaActual = new Date(hoy);

        while (dias.length < 12) {
            const numDia = fechaActual.getDay();
            if (numDia === 0 || numDia === 5 || numDia === 6) {
                const y = fechaActual.getFullYear();
                const m = String(fechaActual.getMonth() + 1).padStart(2, '0');
                const d = String(fechaActual.getDate()).padStart(2, '0');
                const fechaISO = `${y}-${m}-${d}`;
                const nombreDiaCorto = fechaActual.toLocaleDateString('es-MX', { weekday: 'short' });
                const numeroDia = fechaActual.getDate();
                const nombreMesCorto = fechaActual.toLocaleDateString('es-MX', { month: 'short' });

                dias.push({
                    fechaISO,
                    displayStr: `${nombreDiaCorto} ${numeroDia} ${nombreMesCorto}`
                });
            }
            fechaActual.setDate(fechaActual.getDate() + 1);
        }
        return dias;
    }

    const diasDisponibles = generarDiasDisponibles();

    // Funciones para Calendario Dinamico (Tetris)
    function generarSlots() {
        if (!citaForm.fecha || !citaForm.id_servicio || !horarioLaboral) return [];

        const servicio = servicios.find(s => s.id === parseInt(citaForm.id_servicio));
        if (!servicio) return [];

        const duracionTotal = servicio.duracion_aprox + 15;
        const slots = [];
        let [curH, curM] = horarioLaboral.apertura.split(':').map(Number);
        const [endH, endM] = horarioLaboral.cierre.split(':').map(Number);
        const endMinutesOfDay = endH * 60 + endM;

        while ((curH * 60 + curM) + duracionTotal <= endMinutesOfDay) {
            const slotStartStr = `${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;
            const slotEndMins = (curH * 60 + curM) + duracionTotal;
            const slotEndStr = `${String(Math.floor(slotEndMins / 60)).padStart(2, '0')}:${String(slotEndMins % 60).padStart(2, '0')}`;

            let solapa = false;
            let finSolapaMins = 0;

            for (const oc of horasOcupadas) {
                if (slotStartStr < oc.fin && slotEndStr > oc.inicio) {
                    solapa = true;
                    const [ocFinH, ocFinM] = oc.fin.split(':').map(Number);
                    finSolapaMins = (ocFinH * 60) + ocFinM;
                    break;
                }
            }

            if (!solapa) {
                slots.push({ hora: slotStartStr, ocupado: false });
                curM += 45;
                if (curM >= 60) { curH += 1; curM -= 60; }
            } else {
                slots.push({ hora: slotStartStr, ocupado: true });
                let nextMins = finSolapaMins;
                if (nextMins % 5 !== 0) nextMins = nextMins + (5 - (nextMins % 5));
                if (nextMins <= (curH * 60 + curM)) nextMins = (curH * 60 + curM) + 45;
                curH = Math.floor(nextMins / 60);
                curM = nextMins % 60;
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
            {/* Header / Top Nav */}
            <div className="portal-header">
                <div className="portal-header-top">
                    <div className="portal-brand">
                        <Scissors size={20} color="#FF5F40" />
                        <span>The Gangsta</span>
                    </div>
                    <button className="portal-logout" onClick={handleLogout}>
                        Salir
                    </button>
                </div>
                <div className="portal-greeting">
                    <h1>Hola, {user?.nombre?.split(' ')[0]}</h1>
                    <p>Estas a {remaining} cortes de tu acceso VIP.</p>
                </div>
            </div>

            {/* ========= WALLET CARD (Estilo Barbering/Woncards) ========= */}
            <div className="wallet-card">
                {/* Card Header */}
                <div className="wallet-card-header">
                    <div className="wallet-brand">
                        <Scissors size={18} color="#fff" strokeWidth={1.5} />
                        <span>The Gangsta</span>
                    </div>
                    <div className="wallet-nivel">
                        {getNivelIcon()}
                        <span>{wallet?.nivel || 'Bronce'}</span>
                    </div>
                </div>

                {/* Hero Image */}
                <div className="wallet-hero">
                    <img src={heroImg} alt="The Gangsta Barber Shop" />
                    <div className="wallet-hero-overlay"></div>
                    <div className="wallet-hero-text">
                        <h3>Fernando Mendoza</h3>
                        <p>Oaxaca de Juarez</p>
                    </div>
                </div>

                {/* QR Section */}
                <div className="wallet-qr-section">
                    <div className="wallet-qr-wrapper">
                        {wallet?.qr_token ? (
                            <QRCode
                                value={wallet.qr_token}
                                size={140}
                                bgColor="#ffffff"
                                fgColor="#1a1a2e"
                                level="H"
                            />
                        ) : (
                            <div className="wallet-qr-placeholder">Cargando...</div>
                        )}
                    </div>
                    <p className="wallet-client-name">{wallet?.nombre || user?.nombre}</p>
                    <p className="wallet-hint">Muestra este codigo al barbero al terminar tu servicio</p>
                </div>
            </div>

            {/* Tarjeta de Lealtad — Stamps Grid */}
            <div className="loyalty-card">
                <div className="loyalty-card-header">
                    <div className="header-title">
                        <Star size={20} color="#FF5F40" /> Mi Lealtad
                    </div>
                    {wallet?.recompensa_disponible && (
                        <span className="loyalty-badge">
                            <Gift size={14} /> Premio
                        </span>
                    )}
                </div>

                <div className="stamps-grid">
                    {Array.from({ length: maxStamps }, (_, i) => {
                        const isFilled = i < sellosActuales;
                        const isNext = i === sellosActuales;
                        const isGift = i === maxStamps - 1;
                        return (
                            <div
                                key={i}
                                className={`stamp-circle ${isFilled ? 'filled' : ''} ${isNext ? 'next-stamp' : ''}`}
                            >
                                {isFilled ? (
                                    <CheckCircle size={22} />
                                ) : isGift ? (
                                    <Gift size={18} />
                                ) : (
                                    <span className="stamp-number">{i + 1}</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="loyalty-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${(sellosActuales / maxStamps) * 100}%` }}
                        ></div>
                    </div>
                    <span className="progress-text">{sellosActuales} / {maxStamps}</span>
                </div>
            </div>

            {/* Citas / Agenda Section */}
            <h2 className="section-title">
                <Calendar size={20} color="#111827" /> Citas Agendadas
            </h2>

            {citas.filter(c => c.estado !== 'Cancelada').length === 0 ? (
                <div className="info-empy">
                    <Calendar size={32} opacity={0.5} style={{ margin: '0 auto' }} />
                    <p>No tienes citas programadas actualmente.</p>
                </div>
            ) : (
                <div className="citas-list">
                    {citas.filter(c => c.estado !== 'Cancelada').slice(0, 5).map(cita => (
                        <div key={cita.id} className="cita-card">
                            <div className="cita-header">
                                <div className="cita-fecha">
                                    <Calendar size={18} color="#FF5F40" />
                                    {new Date(cita.fecha + 'T00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>
                                <span className={`cita-badge ${cita.estado.toLowerCase()}`}>
                                    {cita.estado}
                                </span>
                            </div>

                            <div className="cita-servicio">
                                <strong>{cita.nombre_servicio || 'Servicio de Barberia'}</strong>
                            </div>

                            <div className="cita-barbero-notes">
                                <span className="cita-barbero">
                                    <Clock size={14} /> {cita.hora} hrs
                                    {cita.barbero_nombre && <><User size={14} style={{ marginLeft: '8px' }} /> {cita.barbero_nombre}</>}
                                </span>
                            </div>

                            <button
                                className="btn-whatsapp-cita"
                                onClick={() => {
                                    const fechaStr = new Date(cita.fecha + 'T00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
                                    const msg = encodeURIComponent(`Hola Fernando, tengo una duda sobre mi cita del ${fechaStr}`);
                                    window.open(`https://wa.me/529511955349?text=${msg}`, '_blank');
                                }}
                            >
                                <MessageCircle size={16} /> Contactar sobre cita
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Bottom Actions Floating Bar */}
            <div className="portal-actions">
                <button className="btn-agendar-main" onClick={openAgendarModal}>
                    <PlusCircle size={20} /> Agendar Cita
                </button>
            </div>

            {/* Modal Agendar Cita */}
            {showAgendarModal && (
                <div className="modal-overlay" onClick={() => setShowAgendarModal(false)}>
                    <div className="modal-content bottom-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                <Calendar size={22} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Nueva Cita
                            </h2>
                            <button className="close-btn" onClick={() => setShowAgendarModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAgendarCita}>
                            <div className="form-group">
                                <label><Scissors size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Servicio</label>
                                <select
                                    className="form-control"
                                    value={citaForm.id_servicio}
                                    onChange={(e) => {
                                        setCitaForm({ ...citaForm, id_servicio: e.target.value, hora: '' });
                                        if (citaForm.fecha) handleFechaChange(citaForm.fecha);
                                    }}
                                    required
                                >
                                    <option value="">Selecciona un servicio</option>
                                    {servicios.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre_servicio} - ${s.precio}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label><Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Fechas Disponibles</label>
                                <div className="dias-carousel">
                                    {diasDisponibles.map(dia => (
                                        <button
                                            key={dia.fechaISO}
                                            type="button"
                                            className={`dia-chip ${citaForm.fecha === dia.fechaISO ? 'selected' : ''}`}
                                            onClick={() => handleFechaChange(dia.fechaISO)}
                                        >
                                            <span className="dia-nombre">{dia.displayStr.split(' ')[0]}</span>
                                            <span className="dia-numero">{dia.displayStr.split(' ')[1]}</span>
                                            <span className="dia-mes">{dia.displayStr.split(' ')[2]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label><Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Horarios Disponibles</label>
                                {(!citaForm.fecha || !citaForm.id_servicio) ? (
                                    <p>Selecciona el servicio y la fecha primero para ver los espacios.</p>
                                ) : horasDisponibles.length === 0 ? (
                                    <p style={{ color: '#EF4444' }}>No hay horarios disponibles en esta fecha.</p>
                                ) : (
                                    <div className="time-grid">
                                        {horasDisponibles.map(slot => (
                                            <button
                                                key={slot.hora}
                                                type="button"
                                                className={`time-chip ${citaForm.hora === slot.hora ? 'selected' : ''} ${slot.ocupado ? 'ocupado' : ''}`}
                                                onClick={() => !slot.ocupado && setCitaForm({ ...citaForm, hora: slot.hora })}
                                                disabled={slot.ocupado}
                                            >
                                                <span className="time-text">{slot.hora}</span>
                                                {slot.ocupado && <span style={{ color: '#EF4444', fontSize: '0.72rem', display: 'block', marginTop: '2px' }}>Ocupado</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label><Star size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Notas al barbero (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Quiero desvanecido medio..."
                                    value={citaForm.notas}
                                    onChange={(e) => setCitaForm({ ...citaForm, notas: e.target.value })}
                                    className="form-control"
                                    maxLength="100"
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn-primary w-100"
                                disabled={!citaForm.fecha || !citaForm.hora || !citaForm.id_servicio}
                            >
                                Confirmar Cita
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
