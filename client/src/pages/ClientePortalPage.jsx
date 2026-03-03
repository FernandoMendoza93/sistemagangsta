import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { citasService, loyaltyService } from '../services/api';
import Swal from 'sweetalert2';
import Icon from '../components/Icon';
import { Calendar, CheckCircle, Gift, Star, Clock, User, X, PlusCircle, QrCode, MessageCircle } from 'lucide-react';
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

    // Generar próximos días disponibles (Viernes, Sábado, Domingo)
    function generarDiasDisponibles() {
        const dias = [];
        const hoy = new Date();
        let fechaActual = new Date(hoy);

        while (dias.length < 12) { // Mostrar próximos 12 días laborales (~1 mes de agenda)
            const numDia = fechaActual.getDay(); // 0=Dom, 1=Lun, ..., 5=Vie, 6=Sáb
            if (numDia === 0 || numDia === 5 || numDia === 6) {
                const fechaISO = fechaActual.toISOString().split('T')[0];
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

    // Funciones para Calendario Dinámico (Tetris)
    function generarSlots() {
        if (!citaForm.fecha || !citaForm.id_servicio || !horarioLaboral) return [];

        const servicio = servicios.find(s => s.id === parseInt(citaForm.id_servicio));
        if (!servicio) return [];

        const duracionTotal = servicio.duracion_aprox + 15; // duración real en backend + 15 min colchón

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

            // En lugar de omitirlos, los marcamos como ocupados para que se vean grises y tachados
            slots.push({ hora: slotStartStr, ocupado: solapa });

            // Cambiado a requerimiento del usuario:
            // Avanzamos 30 minutos visualmente para la siguiente opción dinámica en lugar de 15
            // (El sistema aún restringe la hora de fin real en el backend usando duracionTotal)
            curM += 30;
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
            {/* Header / Top Nav */}
            <div className="portal-header">
                <div className="portal-header-top">
                    <div className="portal-brand">
                        <Icon name="scissors" size={20} color="#FF5F40" />
                        <span>The Gangsta</span>
                    </div>
                    <button className="portal-logout" onClick={handleLogout}>
                        Salir
                    </button>
                </div>
                <div className="portal-greeting">
                    <h1>Hola, {user?.nombre?.split(' ')[0]}</h1>
                    <p>
                        {remaining > 0
                            ? `Estás a ${remaining} corte${remaining > 1 ? 's' : ''} de tu acceso VIP.`
                            : '¡Tienes un corte VIP disponible!'
                        }
                    </p>
                </div>
            </div>

            {/* Hero Section (Welcome Fernando) */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <h2>Fernando Mendoza</h2>
                    <p>Arte, precisión y estilo en cada corte. Oaxaca de Juárez.</p>
                </div>
            </div>

            {/* Loyalty Card (Clean Interface) */}
            <div className="loyalty-card">
                <div className="loyalty-card-header">
                    <div className="header-title">
                        <Star size={20} color="#FF5F40" />
                        Mi Lealtad
                    </div>
                    {completedCards > 0 && (
                        <span className="loyalty-badge">{completedCards} Tarjeta{completedCards > 1 ? 's' : ''} Llenas</span>
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
                                    <CheckCircle size={22} color="#FFFFFF" />
                                ) : i === maxStamps - 1 ? (
                                    <Gift size={22} color={isNextEmpty ? "#FF5F40" : "#9CA3AF"} />
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
                    <span className="progress-text">{currentStamps} / {maxStamps}</span>
                </div>
                {currentStamps === 0 && completedCards > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <button className="btn-agendar-main" onClick={openWhatsApp} style={{ padding: '0.85rem' }}>
                            <Gift size={18} /> Canjear Corte VIP
                        </button>
                    </div>
                )}
            </div>

            {/* Citas / Agenda Section - Listado tipo Event Cards */}
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
                                <strong>{cita.nombre_servicio || 'Servicio de Barbería'}</strong>
                            </div>

                            <div className="cita-barbero-notes">
                                <span className="cita-barbero">
                                    <Clock size={14} /> {cita.hora} hrs
                                    {cita.barbero_nombre && <><User size={14} style={{ marginLeft: '8px' }} /> {cita.barbero_nombre}</>}
                                </span>
                                {cita.notas && (
                                    <span className="cita-notes" title={cita.notas}>
                                        {cita.notas}
                                    </span>
                                )}
                            </div>

                            {/* Botón de Contacto WhatsApp Integrado */}
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
                <button className="btn-scan-main" onClick={() => setShowScannerModal(true)}>
                    <QrCode size={20} /> Escanear QR
                </button>
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
                            {/* Servicio y Barbero (Oculto u Opcional) */}
                            <div className="form-group">
                                <label><Icon name="scissors" size={16} /> Servicio</label>
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

                            {/* Fecha - Carrusel */}
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

                            {/* Hora */}
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
                                                {slot.hora} {slot.ocupado ? '(Ocupado)' : ''}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Notas */}
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

            {/* Modal Scanner QR */}
            {showScannerModal && (
                <div className="modal-overlay" onClick={() => setShowScannerModal(false)}>
                    <div className="modal-content bottom-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><QrCode size={22} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Escanear Código QR</h2>
                            <button className="close-btn" onClick={() => setShowScannerModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="scanner-container">
                            <Scanner
                                onScan={handleScan}
                                formats={['qr_code']}
                            />
                        </div>
                        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#6B7280', fontSize: '0.9rem' }}>
                            Apunta la cámara al código QR proporcionado por tu barbero al finalizar tu corte.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
