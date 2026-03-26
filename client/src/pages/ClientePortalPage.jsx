import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { citasService, clientesService, publicService } from '../services/api';
import { toast } from 'sonner';
import { Calendar, Clock, Star, User, MessageCircle, PlusCircle, X, Scissors, CheckCircle, Gift, QrCode, Crown, Trophy, Store } from 'lucide-react';
import QRCode from 'react-qr-code';
import heroImg from '../assets/hero-bg.jpg';
import './ClientePortalPage.css';


export default function ClientePortalPage() {
    const { slug } = useParams();
    const { user, logout } = useAuth();
    const { applyTheme, resetTheme } = useTheme();
    const navigate = useNavigate();
    const [publicConfig, setPublicConfig] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [citas, setCitas] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [barberos, setBarberos] = useState([]);
    const [showAgendarModal, setShowAgendarModal] = useState(false);
    const [citaForm, setCitaForm] = useState({ id_servicio: '', id_barbero: '', fecha: '', hora: '', notas: '' });
    const [editingCita, setEditingCita] = useState(null);
    const [citaExistenteEnFecha, setCitaExistenteEnFecha] = useState(null);
    const [loading, setLoading] = useState(true);
    const [horasOcupadas, setHorasOcupadas] = useState([]);
    const [horarioLaboral, setHorarioLaboral] = useState(null);
    const [diasActivos, setDiasActivos] = useState([]);
    const [pasoModal, setPasoModal] = useState(1); // 1=Barbero 2=Servicio+Notas 3=Fecha/Hora

    useEffect(() => {
        if (slug) loadPublicConfig();
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
                    loadData();
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

    async function loadPublicConfig() {
        try {
            const res = await publicService.getConfig(slug);
            setPublicConfig(res.data);
            if (res.data.nombre) {
                document.title = `${res.data.nombre} | Flow System`;
            }
            if (res.data.bg_main) {
                applyTheme(res.data, res.data.barberia_id);
            } else {
                resetTheme();
            }
        } catch (error) {
            console.error('Error cargando configuración pública:', error);
        }
    }

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
        setEditingCita(null);
        setCitaExistenteEnFecha(null);
        setDiasActivos([]);
        setHorasOcupadas([]);
        setHorarioLaboral(null);
        setPasoModal(1);
        setShowAgendarModal(true);
    }

    async function handleAgendarCita(e) {
        e.preventDefault();
        try {
            if (editingCita) {
                await citasService.actualizar(editingCita.id, citaForm);
                toast.success('Cita modificada exitosamente');
            } else {
                await citasService.crear(citaForm);
                toast.success('¡Cita Agendada! Te esperamos');
            }
            setShowAgendarModal(false);
            setEditingCita(null);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo procesar la cita');
        }
    }

    async function handleSeleccionarBarbero(id_barbero) {
        setCitaForm(prev => ({ ...prev, id_barbero, fecha: '', hora: '' }));
        setHorasOcupadas([]);
        setHorarioLaboral(null);
        setCitaExistenteEnFecha(null);
        try {
            const res = await citasService.getDiasDisponibles(id_barbero);
            setDiasActivos(res.data.dias || []);
        } catch {
            setDiasActivos([]);
        }
        setPasoModal(2);
    }

    async function handleFechaChange(fecha) {
        setCitaForm(prev => ({ ...prev, fecha, hora: '' }));
        setCitaExistenteEnFecha(null);

        if (!fecha || !citaForm.id_barbero) return;

        // Detectar si el cliente ya tiene una cita activa en esta fecha
        const citaEnFecha = citas.find(c => c.fecha === fecha && c.estado !== 'Cancelada');
        if (citaEnFecha && !editingCita) {
            setCitaExistenteEnFecha(citaEnFecha);
            return;
        }

        try {
            const res = await citasService.getDisponibilidad(fecha, citaForm.id_barbero);
            setHorasOcupadas(res.data.ocupadas || []);
            setHorarioLaboral(res.data.horario || null);
        } catch (error) {
            console.error('Error obteniendo disponibilidad:', error);
            setHorasOcupadas([]);
            setHorarioLaboral(null);
        }
    }

    async function handleModificarCita() {
        const cita = citaExistenteEnFecha;
        setEditingCita(cita);
        setCitaExistenteEnFecha(null);
        setCitaForm(prev => ({
            ...prev,
            id_servicio: prev.id_servicio,
            id_barbero: cita.id_barbero || prev.id_barbero,
            fecha: cita.fecha,
            hora: '',
            notas: cita.notas || ''
        }));

        try {
            const res = await citasService.getDisponibilidad(cita.fecha, citaForm.id_barbero);
            setHorasOcupadas(res.data.ocupadas || []);
            setHorarioLaboral(res.data.horario || null);
        } catch (error) {
            console.error('Error obteniendo disponibilidad:', error);
        }
    }

    function handleLogout() {
        logout();
        navigate(`/portal/${slug}`);
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

    // Generar dias disponibles del barbero basados en diasActivos (desde DB)
    function generarDiasDisponibles() {
        if (diasActivos.length === 0) return [];
        const dias = [];
        const hoy = new Date();
        let fechaActual = new Date(hoy);

        while (dias.length < 12) {
            const numDia = fechaActual.getDay();
            if (diasActivos.includes(numDia)) {
                const y = fechaActual.getFullYear();
                const m = String(fechaActual.getMonth() + 1).padStart(2, '0');
                const d = String(fechaActual.getDate()).padStart(2, '0');
                const fechaISO = `${y}-${m}-${d}`;
                const nombreDiaCorto = fechaActual.toLocaleDateString('es-MX', { weekday: 'short' });
                const numeroDia = fechaActual.getDate();
                const nombreMesCorto = fechaActual.toLocaleDateString('es-MX', { month: 'short' });
                dias.push({ fechaISO, displayStr: `${nombreDiaCorto} ${numeroDia} ${nombreMesCorto}` });
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
                        {publicConfig?.logo_url ? (
                            <img 
                                src={publicConfig.logo_url} 
                                alt="Logo Barberia" 
                                style={{ height: '32px', width: '32px', borderRadius: '8px', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline-block'; }}
                            />
                        ) : null}
                        <div style={{ display: publicConfig?.logo_url ? 'none' : 'inline-block' }}>
                            <Store size={22} color="var(--accent-primary)" />
                        </div>
                        <span>{publicConfig?.nombre || 'Mi Barbería'}</span>
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
                        {publicConfig?.logo_url ? (
                            <img 
                                src={publicConfig.logo_url} 
                                alt="Logo Barberia" 
                                style={{ height: '20px', width: '20px', borderRadius: '4px', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline-block'; }}
                            />
                        ) : null}
                        <div style={{ display: publicConfig?.logo_url ? 'none' : 'inline-block' }}>
                            <Store size={18} color="#fff" strokeWidth={1.5} />
                        </div>
                        <span>{publicConfig?.nombre || 'Mi Barbería'}</span>
                    </div>
                    <div className="wallet-nivel">
                        {getNivelIcon()}
                        <span>{wallet?.nivel || 'Bronce'}</span>
                    </div>
                </div>

                {/* Hero Image */}
                <div className="wallet-hero">
                    <img 
                        src={publicConfig?.loyalty_card_image_url || heroImg} 
                        alt="Fondo Lealtad" 
                        onError={(e) => { e.target.src = heroImg; }}
                    />
                    <div className="wallet-hero-overlay"></div>
                    <div className="wallet-hero-text">
                        <h3>{user?.nombre?.split(' ')[0]}</h3>
                        <p>{wallet?.nivel || 'Socio Flow'}</p>
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
                        <Star size={20} color="var(--accent-primary)" /> Mi Lealtad
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
                <Calendar size={20} color="var(--text-main)" /> Citas Agendadas
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
                                    <Calendar size={18} color="var(--accent-primary)" />
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

            {/* Modal Agendar Cita — 3 pasos */}
            {showAgendarModal && (
                <div className="modal-overlay" onClick={() => setShowAgendarModal(false)}>
                    <div className="modal-content bottom-sheet" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="modal-header">
                            <h2>
                                <Calendar size={22} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                {editingCita ? 'Modificar Cita' : 'Nueva Cita'}
                            </h2>
                            <button className="close-btn" onClick={() => setShowAgendarModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Indicador de pasos */}
                        <div className="paso-indicator">
                            {[1, 2, 3].map(p => (
                                <div
                                    key={p}
                                    className={`paso-pill ${pasoModal === p ? 'active' : pasoModal > p ? 'done' : ''}`}
                                    onClick={() => pasoModal > p && setPasoModal(p)}
                                />
                            ))}
                        </div>

                        {/* ─── PASO 1: Seleccionar Barbero ─── */}
                        {pasoModal === 1 && (
                            <div className="paso-container">
                                <div className="paso-label">
                                    <User size={15} />
                                    Elige tu barbero
                                </div>
                                <div className="barbero-cards-grid">
                                    {barberos.map(b => (
                                        <div
                                            key={b.id}
                                            className={`barbero-card ${citaForm.id_barbero == b.id ? 'selected' : ''}`}
                                            onClick={() => handleSeleccionarBarbero(b.id)}
                                        >
                                            <div className="barbero-avatar">
                                                {b.nombre?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="barbero-nombre">{b.nombre?.split(' ')[0]}</span>
                                            {citaForm.id_barbero == b.id && (
                                                <CheckCircle size={14} className="barbero-check" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ─── PASO 2: Servicio + Notas ─── */}
                        {pasoModal === 2 && (
                            <div className="paso-container">
                                <div className="form-group">
                                    <label><Scissors size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Servicio</label>
                                    <select
                                        className="form-control"
                                        value={citaForm.id_servicio}
                                        onChange={(e) => setCitaForm(prev => ({ ...prev, id_servicio: e.target.value }))}
                                        required
                                    >
                                        <option value="">Selecciona un servicio</option>
                                        {servicios.map(s => (
                                            <option key={s.id} value={s.id}>{s.nombre_servicio} — ${s.precio}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label><Star size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Notas al barbero (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Quiero desvanecido medio..."
                                        value={citaForm.notas}
                                        onChange={(e) => setCitaForm(prev => ({ ...prev, notas: e.target.value }))}
                                        className="form-control"
                                        maxLength="100"
                                    />
                                </div>

                                {citaForm.id_servicio && (
                                    <button
                                        type="button"
                                        className="btn-primary w-100"
                                        onClick={() => setPasoModal(3)}
                                    >
                                        Elegir Fecha y Hora →
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ─── PASO 3: Fecha y Hora + Confirmar ─── */}
                        {pasoModal === 3 && (
                            <form onSubmit={handleAgendarCita} className="paso-container">
                                <div className="form-group">
                                    <label><Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Fechas Disponibles</label>
                                    {diasDisponibles.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.85rem' }}>Este barbero no tiene turnos configurados.</p>
                                    ) : (
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
                                    )}
                                </div>

                                <div className="form-group">
                                    <label><Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Horarios Disponibles</label>

                                    {/* Aviso de cita existente en esta fecha */}
                                    {citaExistenteEnFecha ? (
                                        <div className="cita-existente-aviso">
                                            <div className="aviso-info">
                                                <Calendar size={18} color="var(--accent-primary)" />
                                                <div>
                                                    <p className="aviso-titulo">Ya tienes una cita este dia</p>
                                                    <p className="aviso-detalle">
                                                        {citaExistenteEnFecha.nombre_servicio} a las {citaExistenteEnFecha.hora} hrs
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="aviso-acciones">
                                                <button type="button" className="btn-modificar-cita" onClick={handleModificarCita}>
                                                    Modificar mi cita
                                                </button>
                                                <button type="button" className="btn-otro-dia" onClick={() => {
                                                    setCitaExistenteEnFecha(null);
                                                    setCitaForm(prev => ({ ...prev, fecha: '', hora: '' }));
                                                }}>
                                                    Elegir otro dia
                                                </button>
                                            </div>
                                        </div>
                                    ) : !citaForm.fecha ? (
                                        <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.85rem' }}>Selecciona una fecha primero.</p>
                                    ) : horasDisponibles.length === 0 ? (
                                        <p style={{ color: '#EF4444' }}>No hay horarios disponibles en esta fecha.</p>
                                    ) : (
                                        <div className="time-grid">
                                            {horasDisponibles.map(slot => (
                                                <button
                                                    key={slot.hora}
                                                    type="button"
                                                    className={`time-chip ${citaForm.hora === slot.hora ? 'selected' : ''} ${slot.ocupado ? 'ocupado' : ''}`}
                                                    onClick={() => !slot.ocupado && setCitaForm(prev => ({ ...prev, hora: slot.hora }))}
                                                    disabled={slot.ocupado}
                                                >
                                                    <span className="time-text">{slot.hora}</span>
                                                    {slot.ocupado && <span style={{ color: '#EF4444', fontSize: '0.72rem', display: 'block', marginTop: '2px' }}>Ocupado</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Resumen rápido */}
                                {citaForm.hora && (
                                    <>
                                        <div className="resumen-cita">
                                            <span>📅 {citaForm.fecha} a las {citaForm.hora}</span>
                                            <span>✂️ {barberos.find(b => b.id == citaForm.id_barbero)?.nombre?.split(' ')[0]}</span>
                                            <span>🛍️ {servicios.find(s => s.id == citaForm.id_servicio)?.nombre_servicio}</span>
                                        </div>

                                        <button
                                            type="submit"
                                            className="btn-confirmar-cita"
                                            disabled={!citaForm.hora || citaExistenteEnFecha}
                                        >
                                            <CheckCircle size={18} />
                                            {editingCita ? 'Guardar Cambios' : 'Confirmar Cita'}
                                        </button>
                                    </>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
