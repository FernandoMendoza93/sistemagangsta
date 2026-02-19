import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { barberosService } from '../services/api';

export default function ComisionesPage() {
    const [barberos, setBarberos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBarbero, setSelectedBarbero] = useState(null);
    const [comisiones, setComisiones] = useState(null);
    const [historialPagos, setHistorialPagos] = useState([]);
    const [paying, setPaying] = useState(false);

    useEffect(() => { loadBarberos(); }, []);

    const loadBarberos = async () => {
        try {
            const res = await barberosService.getAll();
            setBarberos(res.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadComisiones = async (id) => {
        try {
            const [comRes, histRes] = await Promise.all([
                barberosService.getComisiones(id),
                barberosService.getHistorialPagos(id)
            ]);
            setComisiones(comRes.data);
            setHistorialPagos(histRes.data);
            setSelectedBarbero(barberos.find(b => b.id === id));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const pagarComisiones = async () => {
        if (!selectedBarbero) return;
        setPaying(true);
        try {
            const res = await barberosService.pagarComisiones(selectedBarbero.id, 'Pago de comisiones');
            Swal.fire({ icon: 'success', title: '¡Pago Realizado!', text: `Se pagaron $${res.data.monto.toFixed(2)}`, confirmButtonColor: '#c9a227' });
            loadComisiones(selectedBarbero.id);
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.error || 'Error al pagar', confirmButtonColor: '#c9a227' });
        } finally {
            setPaying(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">💎 Comisiones</h1>
            </div>

            <div className="card-grid comisiones-layout">
                {/* Lista de Barberos */}
                <div className="card">
                    <h2 className="card-title" style={{ marginBottom: '1rem' }}>Barberos</h2>
                    {barberos.map(b => (
                        <div
                            key={b.id}
                            onClick={() => loadComisiones(b.id)}
                            style={{
                                padding: '1rem',
                                background: selectedBarbero?.id === b.id ? 'rgba(201, 162, 39, 0.1)' : 'var(--bg-input)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '0.5rem',
                                cursor: 'pointer',
                                border: selectedBarbero?.id === b.id ? '1px solid var(--primary)' : '1px solid transparent'
                            }}
                        >
                            <strong style={{ color: '#ffffff' }}>{b.nombre}</strong>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Comisión: {(b.porcentaje_comision * 100).toFixed(0)}%
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detalle de Comisiones */}
                <div className="card">
                    {!selectedBarbero ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                            Selecciona un barbero para ver sus comisiones
                        </p>
                    ) : (
                        <>
                            <div className="card-header">
                                <h2 className="card-title">Comisiones de {selectedBarbero.nombre}</h2>
                                {comisiones?.totales?.pendiente > 0 && (
                                    <button className="btn btn-primary" onClick={pagarComisiones} disabled={paying}>
                                        {paying ? 'Pagando...' : `💰 Pagar $${comisiones.totales.pendiente.toFixed(2)}`}
                                    </button>
                                )}
                            </div>

                            <div className="card-grid comisiones-summary-grid">
                                <div style={{
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1.5rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--warning)', marginBottom: '0.5rem' }}>
                                        ${comisiones?.totales?.pendiente?.toFixed(2) || '0.00'}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Pendiente de Pago</div>
                                </div>
                                <div style={{
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1.5rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--success)', marginBottom: '0.5rem' }}>
                                        ${comisiones?.totales?.pagado?.toFixed(2) || '0.00'}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Total Pagado</div>
                                </div>
                            </div>

                            {/* Tabla de comisiones individuales */}
                            <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr><th>Fecha</th><th>Monto</th><th>Estado</th></tr>
                                    </thead>
                                    <tbody>
                                        {comisiones?.comisiones?.map(c => (
                                            <tr key={c.id}>
                                                <td style={{ color: '#1a1a1a' }}>{new Date(c.fecha).toLocaleDateString('es-MX')}</td>
                                                <td style={{ fontWeight: 600, color: '#1a1a1a' }}>${c.monto.toFixed(2)}</td>
                                                <td>
                                                    <span className={`badge ${c.pagado ? 'badge-success' : 'badge-warning'}`}>
                                                        {c.pagado ? 'Pagado' : 'Pendiente'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Historial de Pagos */}
                            {historialPagos.length > 0 && (
                                <div style={{ marginTop: '1.5rem' }}>
                                    <h3 style={{
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        📋 Historial de Pagos
                                    </h3>
                                    <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Fecha de Pago</th>
                                                    <th>Monto</th>
                                                    <th>Pagado por</th>
                                                    <th>Notas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historialPagos.map(p => (
                                                    <tr key={p.id}>
                                                        <td style={{ color: '#1a1a1a' }}>
                                                            {new Date(p.fecha_pago).toLocaleDateString('es-MX', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                            <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                                                {new Date(p.fecha_pago).toLocaleTimeString('es-MX', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>
                                                            ${p.monto.toFixed(2)}
                                                        </td>
                                                        <td style={{ color: '#1a1a1a' }}>
                                                            {p.pagado_por || 'Admin'}
                                                        </td>
                                                        <td style={{ color: '#555', fontSize: '0.85rem' }}>
                                                            {p.notas || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
