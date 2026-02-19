import { useState, useEffect } from 'react';
import { corteCajaService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
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
    const [loading, setLoading] = useState(true);
    const [montoInicial, setMontoInicial] = useState('');
    const [modoCierre, setModoCierre] = useState('transparente');

    // Modals
    const [showEntradaModal, setShowEntradaModal] = useState(false);
    const [showSalidaModal, setShowSalidaModal] = useState(false);
    const [showCierreModal, setShowCierreModal] = useState(false);

    // Forms
    const [entradaForm, setEntradaForm] = useState({ monto: '', descripcion: '' });
    const [salidaForm, setSalidaForm] = useState({ monto: '', descripcion: '' });
    const [cierreForm, setCierreForm] = useState({ montoReal: '', notas: '' });

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
        } catch (error) {
            console.error('Error cargando datos:', error);
            alert('Error al cargar los datos del corte');
        } finally {
            setLoading(false);
        }
    };

    const handleAbrirTurno = async () => {
        if (!montoInicial || parseFloat(montoInicial) < 0) {
            alert('Ingresa un monto inicial válido');
            return;
        }

        try {
            await corteCajaService.abrir(parseFloat(montoInicial), modoCierre);
            alert(`Turno abierto con $${montoInicial} (Modo: ${modoCierre})`);
            setMontoInicial('');
            cargarDatos();
        } catch (error) {
            console.error(error);
            alert('Error al abrir el turno');
        }
    };

    const handleRegistrarEntrada = async () => {
        const { monto, descripcion } = entradaForm;
        if (!monto || !descripcion) {
            alert('Completa todos los campos');
            return;
        }

        try {
            await corteCajaService.registrarEntrada(parseFloat(monto), descripcion);
            alert('Entrada registrada');
            setEntradaForm({ monto: '', descripcion: '' });
            setShowEntradaModal(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            alert('Error al registrar entrada');
        }
    };

    const handleRegistrarSalida = async () => {
        const { monto, descripcion } = salidaForm;
        if (!monto || !descripcion) {
            alert('Completa todos los campos');
            return;
        }

        try {
            await corteCajaService.registrarGasto(parseFloat(monto), descripcion);
            alert('Salida registrada');
            setSalidaForm({ monto: '', descripcion: '' });
            setShowSalidaModal(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            alert('Error al registrar salida');
        }
    };

    const handleCerrarTurno = async () => {
        const { montoReal, notas } = cierreForm;
        if (montoReal === '' || parseFloat(montoReal) < 0) {
            alert('Ingresa un monto real válido');
            return;
        }

        if (!window.confirm('¿Estás seguro de cerrar el turno?')) return;

        try {
            const res = await corteCajaService.cerrar(parseFloat(montoReal), notas);
            const { resumen } = res.data;

            let mensaje = `Turno cerrado\n\n`;
            mensaje += `Esperado: $${resumen.esperado.toFixed(2)}\n`;
            mensaje += `Real: $${resumen.monto_real_fisico.toFixed(2)}\n`;
            mensaje += `Diferencia: $${resumen.diferencia.toFixed(2)}`;

            alert(mensaje);
            setCierreForm({ montoReal: '', notas: '' });
            setShowCierreModal(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            alert('Error al cerrar el turno');
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
            alert('Error al exportar');
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
                            <Icon name="cash" size={28} color="#2563eb" />
                        </div>
                        <div>
                            <h1>Corte de Caja</h1>
                            <p>Abre un nuevo turno para comenzar</p>
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
                            onChange={(e) => setMontoInicial(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div className="form-group-pro">
                        <label>Modo de Cierre</label>
                        <select value={modoCierre} onChange={(e) => setModoCierre(e.target.value)}>
                            <option value="transparente">Transparente (mostrar esperado)</option>
                            <option value="ciego">Ciego (ocultar esperado)</option>
                        </select>
                        {modoCierre === 'ciego' && (
                            <div className="alert-warning-pro">
                                <Icon name="alert-circle" size={16} color="#f59e0b" />
                                <span>En modo ciego, deberás contar el efectivo sin ver el monto esperado</span>
                            </div>
                        )}
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
                        <Icon name="cash" size={28} color="#2563eb" />
                    </div>
                    <div>
                        <h1>Corte de {encargado || user?.nombre}</h1>
                        <p className="turno-info-pro">
                            <Icon name="clock" size={16} color="#6b7280" />
                            <span>Turno iniciado el {fechaInicio} a las {hora_apertura || 'N/A'}</span>
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

            <div className="acciones-cierre-pro">
                <button className="btn-danger-pro" onClick={() => setShowCierreModal(true)}>
                    <Icon name="lock" size={18} color="white" />
                    <span>Cerrar Turno</span>
                </button>
            </div>

            {/* Modal: Registrar Entrada */}
            {showEntradaModal && (
                <div className="modal-overlay-pro" onClick={() => setShowEntradaModal(false)}>
                    <div className="modal-content-pro" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-pro">
                            <Icon name="arrow-down-circle" size={24} color="#16a34a" />
                            <h2>Registrar Entrada de Efectivo</h2>
                        </div>
                        <div className="form-group-pro">
                            <label>Monto</label>
                            <input
                                type="number"
                                value={entradaForm.monto}
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
                <div className="modal-overlay-pro" onClick={() => setShowSalidaModal(false)}>
                    <div className="modal-content-pro" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-pro">
                            <Icon name="arrow-up-circle" size={24} color="#dc2626" />
                            <h2>Registrar Salida de Efectivo</h2>
                        </div>
                        <div className="form-group-pro">
                            <label>Monto</label>
                            <input
                                type="number"
                                value={salidaForm.monto}
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
                            <button className="`btn-secondary-pro" onClick={() => setShowSalidaModal(false)}>Cancelar</button>
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
                <div className="modal-overlay-pro" onClick={() => setShowCierreModal(false)}>
                    <div className="modal-content-pro modal-large-pro" onClick={e => e.stopPropagation()}>
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

                        <CashDenominationCounter
                            onTotalChange={(total) => setCierreForm({ ...cierreForm, montoReal: total })}
                        />

                        <div className="form-group-pro">
                            <label>Monto Real Físico Contado</label>
                            <input
                                type="number"
                                value={cierreForm.montoReal}
                                onChange={e => setCierreForm({ ...cierreForm, montoReal: e.target.value })}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="form-group-pro">
                            <label>Notas (Opcional)</label>
                            <textarea
                                value={cierreForm.notas}
                                onChange={e => setCierreForm({ ...cierreForm, notas: e.target.value })}
                                placeholder="Observaciones del cierre..."
                                rows="3"
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
        </div>
    );
}
