import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { corteCajaService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import ConfirmModal from '../components/ConfirmModal';
import CorteResumen from '../components/CorteResumen';
import DineroCajaDesglose from '../components/DineroCajaDesglose';
import VentasPorMetodo from '../components/VentasPorMetodo';
import VentasPorDepartamento from '../components/VentasPorDepartamento';
import MovimientosEfectivo from '../components/MovimientosEfectivo';
import CashDenominationCounter from '../components/CashDenominationCounter';
import './CorteCajaPage.css';

export default function CorteCajaPage() {
    const { user } = useAuth();
    const [corteActual, setCorteActual] = useState(null);
    const [desglose, setDesglose] = useState(null);
    const [historialCortes, setHistorialCortes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [montoInicial, setMontoInicial] = useState('');

    // Modals
    const [showEntradaModal, setShowEntradaModal] = useState(false);
    const [showSalidaModal, setShowSalidaModal] = useState(false);
    const [showCierreModal, setShowCierreModal] = useState(false);

    // Forms
    const [entradaForm, setEntradaForm] = useState({ monto: '', descripcion: '' });
    const [salidaForm, setSalidaForm] = useState({ monto: '', descripcion: '' });
    const [cierreForm, setCierreForm] = useState({ montoReal: '', notas: '' });
    const [showCerrarConfirm, setShowCerrarConfirm] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const res = await corteCajaService.getActual();
            setCorteActual(res.data);

            if (res.data.abierto) {
                const desgloseRes = await corteCajaService.getDesglose();
                setDesglose(desgloseRes.data);
            }

            const historialRes = await corteCajaService.getHistorial();
            setHistorialCortes(historialRes.data);
        } catch (error) {
            console.error('Error cargando datos:', error);
            toast.error('Error al cargar los datos del corte');
        } finally {
            setLoading(false);
        }
    };

    const handleAbrirTurno = async () => {
        if (!montoInicial || parseFloat(montoInicial) < 0) {
            return toast.error('Ingresa un monto inicial válido');
        }
        try {
            await corteCajaService.abrir(parseFloat(montoInicial));
            toast.success('Turno abierto correctamente');
            setMontoInicial('');
            cargarDatos();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Error al abrir el turno');
        }
    };

    const handleRegistrarEntrada = async () => {
        if (!entradaForm.monto || !entradaForm.descripcion) return toast.error('Completa los campos');
        try {
            await corteCajaService.registrarEntrada(parseFloat(entradaForm.monto), entradaForm.descripcion);
            toast.success('Entrada registrada');
            setShowEntradaModal(false);
            setEntradaForm({ monto: '', descripcion: '' });
            cargarDatos();
        } catch (error) {
            toast.error('Error al registrar entrada');
        }
    };

    const handleRegistrarSalida = async () => {
        if (!salidaForm.monto || !salidaForm.descripcion) return toast.error('Completa los campos');
        try {
            await corteCajaService.registrarGasto(parseFloat(salidaForm.monto), salidaForm.descripcion);
            toast.success('Salida registrada');
            setShowSalidaModal(false);
            setSalidaForm({ monto: '', descripcion: '' });
            cargarDatos();
        } catch (error) {
            toast.error('Error al registrar salida');
        }
    };

    const handleExportar = async () => {
        try {
            window.open(`${import.meta.env.VITE_API_URL}/api/corte-caja/exportar`, '_blank');
        } catch (error) {
            toast.error('Error al exportar el historial');
        }
    };

    const handleCerrarTurno = () => {
        if (!cierreForm.montoReal || parseFloat(cierreForm.montoReal) < 0) {
            return toast.error('Ingresa el monto físico contado');
        }
        setShowCerrarConfirm(true);
    };

    const confirmarCierre = async () => {
        setShowCerrarConfirm(false);
        try {
            const res = await corteCajaService.cerrar(corteActual.corte.id, parseFloat(cierreForm.montoReal), cierreForm.notas);
            const { resumen } = res.data;

            toast.success(`Turno cerrado — Esperado: $${resumen.esperado.toFixed(2)} | Real: $${resumen.monto_real_fisico.toFixed(2)} | Utilidad: $${resumen.total_ganancias.toFixed(2)}`);
            setShowCierreModal(false);
            setCierreForm({ montoReal: '', notas: '' });
            cargarDatos();
        } catch (error) {
            console.error(error);
            toast.error('Error al cerrar el turno');
        }
    };

    if (loading) return <div className="loading-container"><p>Cargando información del turno...</p></div>;

    if (!corteActual?.abierto) {
        return (
            <div className="corte-caja-page-pro">
                <div className="page-header-pro">
                    <div className="header-title-wrapper">
                        <div className="title-icon">
                            <Icon name="lock" size={28} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <h1 className="corte-title">Caja Cerrada</h1>
                            <p className="corte-subtitle">Abre un nuevo turno para registrar ventas y movimientos</p>
                        </div>
                    </div>
                </div>

                <div className="corte-apertura-card">
                    <h2><Icon name="play-circle" size={20} color="var(--accent-primary)" /> Abrir Nuevo Turno</h2>
                    <div className="form-group-pro">
                        <label>Fondo Inicial en Caja</label>
                        <input
                            type="number"
                            value={montoInicial}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setMontoInicial(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <button className="btn-primary-pro" onClick={handleAbrirTurno}>
                        <Icon name="plus" size={20} color="white" />
                        <span>Abrir Turno</span>
                    </button>
                </div>

                <div className="acciones-secundarias-pro">
                    <button className="btn-secondary-pro" onClick={handleExportar}>
                        <Icon name="download" size={18} />
                        <span>Exportar Historial</span>
                    </button>
                </div>

                <div className="corte-historial-pro">
                    <h2><Icon name="history" size={20} color="var(--accent-primary)" /> Historial de Turnos Recientes</h2>
                    <div className="table-container-glass">
                        <table className="table-glass-pro">
                            <thead>
                                <tr>
                                    <th>Apertura</th>
                                    <th>Encargado</th>
                                    <th>Fondo Inicial</th>
                                    <th>Ventas Totales</th>
                                    <th>Comisiones</th>
                                    <th>Utilidad Neta</th>
                                    <th>Diferencia</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historialCortes.map(corte => (
                                    <tr key={corte.id}>
                                        <td>{new Date(corte.fecha_apertura).toLocaleDateString('es-MX')} {corte.hora_apertura}</td>
                                        <td>{corte.nombre_encargado}</td>
                                        <td>${parseFloat(corte.monto_inicial || 0).toFixed(2)}</td>
                                        <td>${parseFloat(corte.total_ventas || 0).toFixed(2)}</td>
                                        <td style={{ color: '#f97316' }}>-${parseFloat(corte.total_comisiones || 0).toFixed(2)}</td>
                                        <td style={{ color: '#16a34a', fontWeight: 'bold' }}>${parseFloat(corte.total_ganancias || 0).toFixed(2)}</td>
                                        <td className={corte.diferencia < 0 ? 'text-danger-pro' : corte.diferencia > 0 ? 'text-success-pro' : 'text-neutral-pro'}>
                                            ${parseFloat(corte.diferencia || 0).toFixed(2)}
                                        </td>
                                        <td>
                                            <span className={`badge-status ${corte.fecha_cierre ? 'badge-cerrado' : 'badge-activo'}`}>
                                                {corte.fecha_cierre ? 'Cerrado' : 'Activo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {historialCortes.length === 0 && (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay turnos registrados</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    const { encargado, fecha_apertura, hora_apertura } = corteActual.corte;
    const fechaInicio = new Date(fecha_apertura).toLocaleDateString('es-MX');

    return (
        <div className="corte-caja-page-pro">
            <div className="page-header-pro">
                <div className="header-title-wrapper">
                    <div className="title-icon">
                        <Icon name="cash" size={28} color="var(--accent-primary)" />
                    </div>
                    <div>
                        <h1 className="corte-title">Corte de Caja</h1>
                        <p className="turno-info-pro corte-subtitle">
                            <Icon name="clock" size={16} color="var(--text-muted)" />
                            <span>Encargado: {encargado || user?.nombre} • Inicio: {fechaInicio} {hora_apertura || ''}</span>
                        </p>
                    </div>
                </div>
                <div className="header-actions-pro">
                    <button className="btn-entrada-pro" onClick={() => setShowEntradaModal(true)}>
                        <Icon name="arrow-down-circle" size={18} />
                        <span>Registrar Entrada</span>
                    </button>
                    <button className="btn-salida-pro" onClick={() => setShowSalidaModal(true)}>
                        <Icon name="arrow-up-circle" size={18} />
                        <span>Registrar Salida</span>
                    </button>
                    <button className="btn-secondary-pro" onClick={handleExportar}>
                        <Icon name="download" size={18} />
                        <span>Exportar</span>
                    </button>
                </div>
            </div>

            {desglose && (
                <>
                    <CorteResumen
                        totalVentas={desglose.resumen.total_ventas}
                        totalComisiones={desglose.resumen.total_comisiones}
                        totalGanancia={desglose.resumen.total_ganancias}
                        dineroEsperado={desglose.resumen.dinero_esperado}
                    />

                    <div className="desglose-grid-pro">
                        <div className="desglose-left">
                            <DineroCajaDesglose dineroEnCaja={desglose.dinero_en_caja} />
                            <MovimientosEfectivo movimientos={desglose.movimientos} />
                        </div>

                        <div className="desglose-right">
                            <VentasPorMetodo ventas={desglose.ventas_por_metodo} />
                            <VentasPorDepartamento rentabilidad={desglose.rentabilidad_por_departamento} />
                        </div>
                    </div>
                </>
            )}

            <div className="corte-historial-pro">
                <h2><Icon name="history" size={20} color="var(--accent-primary)" /> Historial de Turnos Recientes</h2>
                <div className="table-container-glass">
                    <table className="table-glass-pro">
                        <thead>
                            <tr>
                                <th>Apertura</th>
                                <th>Encargado</th>
                                <th>Fondo Inicial</th>
                                <th>Ventas Totales</th>
                                <th>Comisiones</th>
                                <th>Utilidad Neta</th>
                                <th>Diferencia</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historialCortes.map(corte => (
                                <tr key={corte.id}>
                                    <td>{new Date(corte.fecha_apertura).toLocaleDateString('es-MX')} {corte.hora_apertura}</td>
                                    <td>{corte.nombre_encargado}</td>
                                    <td>${parseFloat(corte.monto_inicial || 0).toFixed(2)}</td>
                                    <td>${parseFloat(corte.total_ventas || 0).toFixed(2)}</td>
                                    <td style={{ color: '#f97316' }}>-${parseFloat(corte.total_comisiones || 0).toFixed(2)}</td>
                                    <td style={{ color: '#16a34a', fontWeight: 'bold' }}>${parseFloat(corte.total_ganancias || 0).toFixed(2)}</td>
                                    <td className={corte.diferencia < 0 ? 'text-danger-pro' : corte.diferencia > 0 ? 'text-success-pro' : 'text-neutral-pro'}>
                                        ${parseFloat(corte.diferencia || 0).toFixed(2)}
                                    </td>
                                    <td>
                                        <span className={`badge-status ${corte.fecha_cierre ? 'badge-cerrado' : 'badge-activo'}`}>
                                            {corte.fecha_cierre ? 'Cerrado' : 'Activo'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {historialCortes.length === 0 && (
                                <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay turnos registrados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="acciones-cierre-pro">
                <button className="btn-danger-pro" onClick={() => setShowCierreModal(true)}>
                    <Icon name="lock" size={18} color="white" />
                    <span>Cerrar Turno</span>
                </button>
            </div>

            {/* Modal: Registrar Entrada */}
            {showEntradaModal && (
                <div className="modal-overlay-pro">
                    <div className="modal-content-pro">
                        <div className="modal-header-pro">
                            <Icon name="arrow-down-circle" size={24} color="#16a34a" />
                            <h2>Registrar Entrada de Efectivo</h2>
                        </div>
                        <div className="form-group-pro">
                            <label>Monto</label>
                            <input
                                type="number"
                                value={entradaForm.monto}
                                onFocus={(e) => e.target.select()}
                                onChange={e => setEntradaForm({ ...entradaForm, monto: e.target.value })}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group-pro">
                            <label>Descripción</label>
                            <input
                                type="text"
                                value={entradaForm.descripcion}
                                onChange={e => setEntradaForm({ ...entradaForm, descripcion: e.target.value })}
                                placeholder="Ej. Entrada de dinero"
                            />
                        </div>
                        <div className="modal-actions-pro">
                            <button className="btn-secondary-pro" onClick={() => setShowEntradaModal(false)}>Cancelar</button>
                            <button className="btn-primary-pro" onClick={handleRegistrarEntrada}>
                                <Icon name="check-circle" size={18} color="white" />
                                <span>Registrar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Registrar Salida */}
            {showSalidaModal && (
                <div className="modal-overlay-pro">
                    <div className="modal-content-pro">
                        <div className="modal-header-pro">
                            <Icon name="arrow-up-circle" size={24} color="#dc2626" />
                            <h2>Registrar Salida de Efectivo</h2>
                        </div>
                        <div className="form-group-pro">
                            <label>Monto</label>
                            <input
                                type="number"
                                value={salidaForm.monto}
                                onFocus={(e) => e.target.select()}
                                onChange={e => setSalidaForm({ ...salidaForm, monto: e.target.value })}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group-pro">
                            <label>Descripción</label>
                            <input
                                type="text"
                                value={salidaForm.descripcion}
                                onChange={e => setSalidaForm({ ...salidaForm, descripcion: e.target.value })}
                                placeholder="Ej. Pago a proveedor, Desayuno"
                            />
                        </div>
                        <div className="modal-actions-pro">
                            <button className="btn-secondary-pro" onClick={() => setShowSalidaModal(false)}>Cancelar</button>
                            <button className="btn-danger-pro" onClick={handleRegistrarSalida}>
                                <Icon name="check-circle" size={18} color="white" />
                                <span>Registrar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Cerrar Turno */}
            {showCierreModal && (
                <div className="modal-overlay-pro">
                    <div className="modal-content-pro modal-large-pro">
                        <div className="modal-header-pro">
                            <Icon name="lock" size={24} color="#dc2626" />
                            <h2>Cerrar Turno</h2>
                        </div>

                        {corteActual.corte.modo_cierre === 'transparente' && (
                            <div className="info-box-pro">
                                <Icon name="cash" size={20} color="#16a34a" />
                                <div>
                                    <strong>Dinero Esperado</strong>
                                    <p>${corteActual.esperado?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '0.5rem' }}>
                            <CashDenominationCounter
                                onTotalChange={(total) => setCierreForm({ ...cierreForm, montoReal: total })}
                            />
                        </div>

                        <div className="form-group-pro">
                            <label>Monto Real Físico Contado</label>
                            <input
                                type="number"
                                value={cierreForm.montoReal}
                                onFocus={(e) => e.target.select()}
                                onChange={e => setCierreForm({ ...cierreForm, montoReal: e.target.value })}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="modal-actions-pro">
                            <button className="btn-secondary-pro" onClick={() => setShowCierreModal(false)}>Cancelar</button>
                            <button className="btn-danger-pro" onClick={handleCerrarTurno}>
                                <Icon name="lock" size={18} color="white" />
                                <span>Cerrar Turno</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={showCerrarConfirm}
                title="¿Cerrar turno?"
                message="¿Estás seguro de que deseas cerrar el turno? Esta acción no se puede deshacer."
                icon="🔒"
                confirmText="Sí, cerrar"
                cancelText="Cancelar"
                danger
                onConfirm={confirmarCierre}
                onCancel={() => setShowCerrarConfirm(false)}
            />
        </div>
    );
}
