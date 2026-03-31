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
            toast.warning('Ingresa un monto inicial válido');
            return;
        }

        try {
            await corteCajaService.abrir(parseFloat(montoInicial), 'transparente');
            toast.success(`¡Turno Abierto con $${montoInicial}!`);
            setMontoInicial('');
            cargarDatos();
        } catch (error) {
            console.error(error);
            toast.error('Error al abrir el turno');
        }
    };

    const handleRegistrarEntrada = async () => {
        const { monto, descripcion } = entradaForm;
        if (!monto || !descripcion) {
            toast.warning('Completa todos los campos');
            return;
        }

        try {
            await corteCajaService.registrarEntrada(parseFloat(monto), descripcion);
            toast.success('Entrada registrada correctamente');
            setEntradaForm({ monto: '', descripcion: '' });
            setShowEntradaModal(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            toast.error('Error al registrar entrada');
        }
    };

    const handleRegistrarSalida = async () => {
        const { monto, descripcion } = salidaForm;
        if (!monto || !descripcion) {
            toast.warning('Completa todos los campos');
            return;
        }

        try {
            await corteCajaService.registrarGasto(parseFloat(monto), descripcion);
            toast.success('Salida registrada correctamente');
            setSalidaForm({ monto: '', descripcion: '' });
            setShowSalidaModal(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            toast.error('Error al registrar salida');
        }
    };

    const handleCerrarTurno = async () => {
        const { montoReal, notas } = cierreForm;
        if (montoReal === '' || parseFloat(montoReal) < 0) {
            toast.warning('Ingresa un monto real válido');
            return;
        }

        setShowCerrarConfirm(true);
    };

    const confirmarCierre = async () => {
        setShowCerrarConfirm(false);
        try {
            const res = await corteCajaService.cerrar(parseFloat(cierreForm.montoReal), cierreForm.notas);
            const { resumen } = res.data;

            toast.success(`Turno cerrado — Esperado: $${resumen.esperado.toFixed(2)} | Real: $${resumen.monto_real_fisico.toFixed(2)} | Diferencia: $${resumen.diferencia.toFixed(2)}`);
            setCierreForm({ montoReal: '', notas: '' });
            setShowCierreModal(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            toast.error('Error al cerrar el turno');
        }
    };

    const handleExportar = async () => {
        try {
            const res = await corteCajaService.exportar();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'corte_caja_historial.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(error);
            toast.error('Error al exportar');
        }
    };

    if (loading) {
        return <div className="loading">Cargando...</div>;
    }

    // Vista: Caja Cerrada
    if (!corteActual || !corteActual.abierto) {
        return (
            <div className="corte-caja-page-pro">
                <div className="page-header-pro">
                    <div className="header-title-wrapper">
                        <div className="title-icon">
                            <Icon name="cash" size={28} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <h1 className="corte-title">Corte de Caja</h1>
                            <p className="corte-subtitle">Abre un nuevo turno para comenzar</p>
                        </div>
                    </div>
                </div>

                <div className="abrir-turno-card-pro">
                    <h2>Abrir Nuevo Turno</h2>
                    <div className="form-group-pro">
                        <label>Fondo Inicial</label>
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

                {/* Historial de Turnos */}
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
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay turnos registrados</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // Vista: Turno Activo
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

            {/* Historial de Turnos (Siempre visible) */}
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
                                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay turnos registrados</td></tr>
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
