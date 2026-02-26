import { useState, useEffect } from 'react';
import { citasService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import Icon from '../components/Icon';
import './CitasPage.css';

export default function CitasPage() {
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0]); // Hoy
    const { user, isBarbero } = useAuth();

    useEffect(() => {
        loadCitas();
    }, [filtroFecha]);

    async function loadCitas() {
        setLoading(true);
        try {
            const res = await citasService.getAll(filtroFecha);
            setCitas(res.data);
        } catch (error) {
            console.error('Error cargando citas:', error);
            Swal.fire('Error', 'No se pudieron cargar las citas', 'error');
        } finally {
            setLoading(false);
        }
    }

    const cambiarEstado = async (id, nuevoEstado) => {
        try {
            await citasService.cambiarEstado(id, nuevoEstado);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Cita ${nuevoEstado.toLowerCase()}`,
                showConfirmButton: false,
                timer: 2000
            });
            loadCitas();
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar la cita', 'error');
        }
    };

    const handleConfirmar = (id) => cambiarEstado(id, 'Confirmada');
    const handleCompletar = (id) => cambiarEstado(id, 'Completada');

    const handleCancelar = (id) => {
        Swal.fire({
            title: '¿Cancelar cita?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cancelar cita',
            cancelButtonText: 'Volver'
        }).then((result) => {
            if (result.isConfirmed) {
                cambiarEstado(id, 'Cancelada');
            }
        });
    };

    const getEstadoBadge = (estado) => {
        const badges = {
            'Pendiente': 'bg-warning text-dark',
            'Confirmada': 'bg-info text-dark',
            'Completada': 'bg-success',
            'Cancelada': 'bg-danger'
        };
        return <span className={`badge ${badges[estado] || 'bg-secondary'}`}>{estado}</span>;
    };

    return (
        <div className="page-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><Icon name="calendar-check" className="me-2" /> Agenda de Citas</h2>

                <div className="d-flex align-items-center gap-2">
                    <label className="text-secondary mb-0">Fecha:</label>
                    <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                    />
                    <button className="btn btn-outline-warning" onClick={() => {
                        setFiltroFecha(''); // Cargar todas
                    }}>
                        Ver Todas
                    </button>
                </div>
            </div>

            <div className="card bg-dark text-white border-secondary">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-dark table-hover mb-0 align-middle custom-table">
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>Cliente</th>
                                    <th>Servicio</th>
                                    {!isBarbero() && <th>Barbero Solicitado</th>}
                                    <th>Contacto</th>
                                    <th>Estado</th>
                                    <th className="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={isBarbero() ? "6" : "7"} className="text-center py-4">
                                            <div className="spinner-border text-warning" role="status">
                                                <span className="visually-hidden">Cargando...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : citas.length === 0 ? (
                                    <tr>
                                        <td colSpan={isBarbero() ? "6" : "7"} className="text-center py-4 text-secondary">
                                            <Icon name="calendar-x" size={32} className="mb-2 d-block mx-auto opacity-50" />
                                            No hay citas programadas para esta fecha
                                        </td>
                                    </tr>
                                ) : (
                                    citas.map(cita => (
                                        <tr key={cita.id}>
                                            <td data-label="Fecha y Hora">
                                                <div className="fw-bold">{cita.fecha}</div>
                                                <div className="text-warning">{cita.hora}</div>
                                            </td>
                                            <td data-label="Cliente">
                                                <div className="fw-bold fs-6">{cita.cliente_nombre}</div>
                                                {cita.notas && (
                                                    <div className="text-secondary small mt-1">
                                                        <Icon name="chat-left-text" className="me-1" /> {cita.notas}
                                                    </div>
                                                )}
                                            </td>
                                            <td data-label="Servicio">
                                                {cita.nombre_servicio || <span className="text-muted">No especificado</span>}
                                            </td>
                                            {!isBarbero() && (
                                                <td data-label="Barbero Solicitado">{cita.barbero_nombre || <span className="text-muted">Cualquiera</span>}</td>
                                            )}
                                            <td data-label="Contacto">
                                                <a href={`https://wa.me/52${cita.cliente_telefono}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success">
                                                    <Icon name="whatsapp" className="me-1" />
                                                    {cita.cliente_telefono}
                                                </a>
                                            </td>
                                            <td data-label="Estado">{getEstadoBadge(cita.estado)}</td>
                                            <td className="text-end acciones-mobile">
                                                {cita.estado === 'Pendiente' && (
                                                    <button
                                                        className="btn btn-sm btn-info me-2 mb-1"
                                                        onClick={() => handleConfirmar(cita.id)}
                                                        title="Confirmar Cita"
                                                    >
                                                        <Icon name="check2-circle" /> Confirmar
                                                    </button>
                                                )}

                                                {(cita.estado === 'Pendiente' || cita.estado === 'Confirmada') && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-success me-2 mb-1"
                                                            onClick={() => handleCompletar(cita.id)}
                                                            title="Marcar como Completada"
                                                        >
                                                            <Icon name="check-all" />
                                                        </button>
                                                    </>
                                                )}
                                                {/* Se permite cancelar citas completadas para limpiar pruebas fallidas */}
                                                {(cita.estado === 'Pendiente' || cita.estado === 'Confirmada' || cita.estado === 'Completada') && (
                                                    <button
                                                        className="btn btn-sm btn-outline-danger mb-1"
                                                        onClick={() => handleCancelar(cita.id)}
                                                        title="Cancelar Cita"
                                                    >
                                                        <Icon name="x-lg" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
