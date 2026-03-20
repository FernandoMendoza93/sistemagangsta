import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
            toast.success(`¡Pago Realizado! Se pagaron $${res.data.monto.toFixed(2)}`);
            loadComisiones(selectedBarbero.id);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al pagar');
        } finally {
            setPaying(false);
        }
    };

    const cardStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px var(--shadow-color)' };
    const thStyle = { background: 'var(--bg-input)', color: 'var(--text-muted)', padding: '0.75rem 1.25rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' };
    const tdStyle = { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">💎 Comisiones</h1>
            </div>

            <div className="card-grid comisiones-layout">
                {/* Lista de Barberos */}
                <div style={cardStyle}>
                    <h2 style={{ margin: 0, marginBottom: '1rem', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>Barberos</h2>
                    {barberos.map(b => (
                        <div
                            key={b.id}
                            onClick={() => loadComisiones(b.id)}
                            style={{
                                padding: '1rem',
                                background: selectedBarbero?.id === b.id ? 'rgba(201, 162, 39, 0.1)' : 'var(--bg-input)',
                                borderRadius: '12px',
                                marginBottom: '0.5rem',
                                cursor: 'pointer',
                                border: selectedBarbero?.id === b.id ? '1px solid var(--accent-primary)' : '1px solid transparent'
                            }}
                        >
                            <strong style={{ color: 'var(--text-main)' }}>{b.nombre}</strong>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Comisión: {(b.porcentaje_comision * 100).toFixed(0)}%
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detalle de Comisiones */}
                <div style={cardStyle}>
                    {!selectedBarbero ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                            Selecciona un barbero para ver sus comisiones
                        </p>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <h2 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>Comisiones de {selectedBarbero.nombre}</h2>
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
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--warning)', marginBottom: '0.5rem' }}>
                                        ${comisiones?.totales?.pendiente?.toFixed(2) || '0.00'}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>Pendiente de Pago</div>
                                </div>
                                <div style={{
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--success)', marginBottom: '0.5rem' }}>
                                        ${comisiones?.totales?.pagado?.toFixed(2) || '0.00'}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>Total Pagado</div>
                                </div>
                            </div>

                            {/* Tabla de comisiones individuales */}
                            <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border-color)', maxHeight: '300px', overflow: 'auto', marginTop: '1rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)' }}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Fecha</th>
                                            <th style={thStyle}>Monto</th>
                                            <th style={thStyle}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comisiones?.comisiones?.map(c => (
                                            <tr key={c.id}>
                                                <td style={tdStyle}>{new Date(c.fecha).toLocaleDateString('es-MX')}</td>
                                                <td style={{ ...tdStyle, fontWeight: 600 }}>${c.monto.toFixed(2)}</td>
                                                <td style={tdStyle}>
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
                                        color: 'var(--text-main)',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        📋 Historial de Pagos
                                    </h3>
                                    <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border-color)', maxHeight: '300px', overflow: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)' }}>
                                            <thead>
                                                <tr>
                                                    <th style={thStyle}>Fecha de Pago</th>
                                                    <th style={thStyle}>Monto</th>
                                                    <th style={thStyle}>Pagado por</th>
                                                    <th style={thStyle}>Notas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historialPagos.map(p => (
                                                    <tr key={p.id}>
                                                        <td style={tdStyle}>
                                                            {new Date(p.fecha_pago).toLocaleDateString('es-MX', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {new Date(p.fecha_pago).toLocaleTimeString('es-MX', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>
                                                            ${p.monto.toFixed(2)}
                                                        </td>
                                                        <td style={tdStyle}>
                                                            {p.pagado_por || 'Admin'}
                                                        </td>
                                                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
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
