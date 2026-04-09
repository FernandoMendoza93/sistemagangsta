import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { citasService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import ConfirmModal from '../components/ConfirmModal';
import CierreServicioModal from '../components/CierreServicioModal';
import { Calendar, CheckCircle, XCircle, User, Clock, CheckSquare, X, MessageCircle } from 'lucide-react';
import './CitasPage.css';

const START_HOUR = 10;
const END_HOUR = 22;
const MINUTE_HEIGHT = 1.6;

export default function CitasPage() {
    const [searchParams] = useSearchParams();
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroFecha, setFiltroFecha] = useState(() => {
        // Si viene de una notificación con ?fecha=, usar esa fecha
        const fromNotif = searchParams.get('fecha');
        if (fromNotif) return fromNotif;
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const { user, isBarbero } = useAuth();

    // Detail Modal State
    const [selectedCita, setSelectedCita] = useState(null);
    // Cancel Confirm State
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelTargetId, setCancelTargetId] = useState(null);

    // Cierre Modal State
    const [showCierreModal, setShowCierreModal] = useState(false);
    const [selectedCierreCita, setSelectedCierreCita] = useState(null);

    useEffect(() => {
        loadCitas();
    }, [filtroFecha]);

    async function loadCitas() {
        setLoading(true);
        try {
            const res = await citasService.getAll(filtroFecha);
            setCitas(res.data.filter(c => c.estado !== 'Cancelada'));
        } catch (error) {
            console.error('Error cargando citas:', error);
            toast.error('No se pudieron cargar las citas');
        } finally {
            setLoading(false);
        }
    }

    const cambiarEstado = async (id, nuevoEstado) => {
        try {
            await citasService.cambiarEstado(id, nuevoEstado);
            toast.success(`Cita ${nuevoEstado.toLowerCase()}`);
            setSelectedCita(null);
            loadCitas();
        } catch (error) {
            toast.error('No se pudo actualizar la cita');
        }
    };

    const handleConfirmar = (id) => cambiarEstado(id, 'Confirmada');
    const handleCompletarClick = (cita) => {
        setSelectedCita(null); // Cerrar el modal de detalles
        setSelectedCierreCita(cita);
        setShowCierreModal(true);
    };
    const handleCancelar = (id) => {
        setCancelTargetId(id);
        setShowCancelConfirm(true);
    };

    const confirmCancel = () => {
        if (cancelTargetId) {
            cambiarEstado(cancelTargetId, 'Cancelada');
        }
        setShowCancelConfirm(false);
        setCancelTargetId(null);
    };

    const handleBlockClick = (cita) => {
        setSelectedCita(cita);
    };

    const timeScale = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
        timeScale.push(`${h}:00`);
    }

    let barbersList = isBarbero() ? [user.nombre] : [...new Set(citas.map(c => c.barbero_nombre || 'Cualquiera'))];
    if (barbersList.length === 0) barbersList = ['General'];

    const getBlockStyle = (cita) => {
        const [h, m] = cita.hora.split(':').map(Number);
        const top = ((h - START_HOUR) * 60 + m) * MINUTE_HEIGHT;
        const dur = cita.duracion_aprox || 30;
        const height = dur * MINUTE_HEIGHT;

        let bgColor = '#6B7280';
        const sName = cita.nombre_servicio?.toLowerCase() || '';

        if (sName.includes('barba')) bgColor = '#60A5FA';
        if (sName.includes('corte') && !sName.includes('barba')) bgColor = '#10B981';
        if (sName.includes('combo') || (sName.includes('corte') && sName.includes('barba'))) bgColor = 'var(--accent-secondary, #FF7F50)';
        if (sName.includes('tinte')) bgColor = '#A78BFA';

        const opacity = cita.estado === 'Completada' ? 0.6 : (cita.estado === 'Pendiente' ? 0.8 : 1);

        return {
            top: `${top}px`,
            height: `${height - 2}px`,
            backgroundColor: bgColor,
            opacity: opacity
        };
    };

    return (
        <div className="calendar-page-container">
            <div className="calendar-header-panel">
                <div className="header-left">
                    <Calendar size={28} color="var(--accent-primary)" />
                    <h2>Agenda del Día</h2>
                </div>
                <div className="header-right">
                    <input
                        type="date"
                        className="calendar-date-picker"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="calendar-loading">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="calendar-board">
                    <div className="time-scale-col">
                        <div className="col-header">Hora</div>
                        <div className="time-slots">
                            {timeScale.map(time => (
                                <div key={time} className="time-marker" style={{ height: `${60 * MINUTE_HEIGHT}px` }}>
                                    <span>{time}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="barber-cols-container">
                        {barbersList.map(barber => {
                            const barberCitas = citas.filter(c => (c.barbero_nombre || 'Cualquiera') === barber);
                            return (
                                <div key={barber} className="barber-col">
                                    <div className="col-header">
                                        <User size={16} />
                                        <span>{barber.split(' ')[0]}</span>
                                    </div>
                                    <div className="blocks-layer" style={{ height: `${(END_HOUR - START_HOUR + 1) * 60 * MINUTE_HEIGHT}px` }}>
                                        {timeScale.map(time => (
                                            <div key={time} className="grid-line" style={{ height: `${60 * MINUTE_HEIGHT}px` }}></div>
                                        ))}

                                        {barberCitas.map(cita => {
                                            const statusIcon = cita.estado === 'Pendiente' ? <Clock size={14} /> :
                                                cita.estado === 'Confirmada' ? <CheckCircle size={14} /> :
                                                    <CheckSquare size={14} />;

                                            return (
                                                <div
                                                    key={cita.id}
                                                    className={`cita-block ${cita.estado.toLowerCase()}`}
                                                    style={getBlockStyle(cita)}
                                                    onClick={() => handleBlockClick(cita)}
                                                >
                                                    <div className="block-time">{cita.hora}</div>
                                                    <div className="block-client"><strong>{cita.cliente_nombre.split(' ')[0]}</strong></div>
                                                    <div className="block-service">{cita.nombre_servicio}</div>
                                                    <div className="block-status" title={cita.estado}>
                                                        {statusIcon}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== Appointment Detail Modal ===== */}
            {selectedCita && (
                <div className="confirm-modal-overlay">
                    <div className="confirm-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                                {selectedCita.hora} — {selectedCita.nombre_servicio || 'Servicio'}
                            </h3>
                            <button
                                onClick={() => setSelectedCita(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} color="#9ca3af" />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '14px', color: 'var(--text-main)' }}>
                            <p style={{ margin: 0 }}><strong>Cliente:</strong> {selectedCita.cliente_nombre}</p>
                            <p style={{ margin: 0 }}><strong>Teléfono:</strong> {selectedCita.cliente_telefono || 'No registrado'}</p>
                            <p style={{ margin: 0 }}><strong>Barbero:</strong> {selectedCita.barbero_nombre || 'Cualquiera'}</p>
                            <p style={{ margin: 0 }}>
                                <strong>Estado:</strong>{' '}
                                <span className={`badge ${selectedCita.estado === 'Completada' ? 'badge-success' : selectedCita.estado === 'Confirmada' ? 'badge-info' : 'badge-warning'}`}>
                                    {selectedCita.estado}
                                </span>
                            </p>
                            {selectedCita.notas && <p style={{ margin: 0 }}><strong>Notas:</strong> {selectedCita.notas}</p>}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {selectedCita.estado === 'Pendiente' && (
                                <button
                                    className="confirm-modal-btn"
                                    style={{ background: 'var(--info, #3b82f6)', color: '#fff', width: '100%' }}
                                    onClick={() => handleConfirmar(selectedCita.id)}
                                >
                                    ✓ Confirmar Cita
                                </button>
                            )}
                            {(selectedCita.estado === 'Pendiente' || selectedCita.estado === 'Confirmada') && (
                                <button
                                    className="confirm-modal-btn"
                                    style={{ background: 'var(--success, #10b981)', color: '#fff', width: '100%' }}
                                    onClick={() => handleCompletarClick(selectedCita)}
                                >
                                    ✓ Marcar como Completada
                                </button>
                            )}
                            {selectedCita.estado !== 'Cancelada' && selectedCita.estado !== 'Completada' && (
                                <button
                                    className="confirm-modal-btn"
                                    style={{ background: 'var(--danger, #ef4444)', color: '#fff', width: '100%' }}
                                    onClick={() => handleCancelar(selectedCita.id)}
                                >
                                    ✗ Cancelar Cita
                                </button>
                            )}
                            {selectedCita.cliente_telefono && (
                                <a
                                    href={`https://wa.me/52${selectedCita.cliente_telefono}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="confirm-modal-btn"
                                    style={{
                                        background: '#22c55e', color: 'white', width: '100%',
                                        textDecoration: 'none', display: 'flex', justifyContent: 'center',
                                        alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <MessageCircle size={16} /> Enviar Mensaje
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation */}
            <ConfirmModal
                open={showCancelConfirm}
                title="¿Cancelar cita?"
                message="Esta acción no se puede deshacer. El horario quedará disponible nuevamente."
                icon="⚠️"
                confirmText="Sí, cancelar cita"
                cancelText="Volver"
                danger
                onConfirm={confirmCancel}
                onCancel={() => { setShowCancelConfirm(false); setCancelTargetId(null); }}
            />

            {/* Cierre Servicio Modal */}
            {showCierreModal && selectedCierreCita && (
                <CierreServicioModal
                    cita={selectedCierreCita}
                    onClose={() => {
                        setShowCierreModal(false);
                        setSelectedCierreCita(null);
                    }}
                    onSuccess={() => {
                        toast.success('Servicio cerrado y cobrado correctamente');
                        loadCitas();
                    }}
                />
            )}
        </div>
    );
}
