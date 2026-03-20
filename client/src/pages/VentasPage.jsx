import { useState, useEffect } from 'react';
import { ventasService } from '../services/api';
import Icon from '../components/Icon';

// Función para obtener la fecha local en formato YYYY-MM-DD
const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function VentasPage() {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fecha, setFecha] = useState(getLocalDate());
    const [selectedVenta, setSelectedVenta] = useState(null);
    const [detalles, setDetalles] = useState([]);

    useEffect(() => {
        loadVentas();
    }, [fecha]);

    const loadVentas = async () => {
        setLoading(true);
        try {
            const res = await ventasService.getAll({ fecha });
            setVentas(res.data);
        } catch (error) {
            console.error('Error cargando ventas:', error);
        } finally {
            setLoading(false);
        }
    };

    const verDetalle = async (ventaId) => {
        try {
            const res = await ventasService.getById(ventaId);
            setSelectedVenta(res.data);
            setDetalles(res.data.detalles || []);
        } catch (error) {
            console.error('Error cargando detalle:', error);
        }
    };

    const getTotal = () => ventas.reduce((sum, v) => sum + v.total_venta, 0);

    const thStyle = { background: 'var(--bg-input)', color: 'var(--text-muted)', padding: '0.75rem 1.25rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' };
    const tdStyle = { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' };
    const cardStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px var(--shadow-color)' };

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="header-title-wrapper">
                        <div className="title-icon">
                            <Icon name="file-text" size={28} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <h1 className="page-title">Ventas del Día</h1>
                            <p className="page-subtitle">{ventas.length} ventas registradas</p>
                        </div>
                    </div>
                </div>
                <input
                    type="date"
                    className="form-input"
                    style={{ width: 'auto' }}
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                />
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.5rem' }}>
                <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="dollar-circle" size={28} color="#10B981" />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>${getTotal().toFixed(2)}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total del Día</div>
                    </div>
                </div>
                <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="shopping-cart" size={28} color="#3B82F6" />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{ventas.length}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ventas Realizadas</div>
                    </div>
                </div>
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: selectedVenta ? '1fr 380px' : '1fr' }}>
                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>Lista de Ventas</h2>
                        </div>
                        <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)' }}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>#</th>
                                        <th style={thStyle}>Hora</th>
                                        <th style={thStyle}>Barbero</th>
                                        <th style={thStyle}>Método</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                                        <th style={thStyle}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ventas.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No hay ventas registradas para esta fecha
                                            </td>
                                        </tr>
                                    ) : (
                                        ventas.map(v => (
                                            <tr key={v.id}>
                                                <td style={{ ...tdStyle, background: selectedVenta?.id === v.id ? 'rgba(201, 162, 39, 0.1)' : 'var(--bg-surface)' }}>{v.id}</td>
                                                <td style={{ ...tdStyle, background: selectedVenta?.id === v.id ? 'rgba(201, 162, 39, 0.1)' : 'var(--bg-surface)' }}>{new Date(v.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td style={{ ...tdStyle, background: selectedVenta?.id === v.id ? 'rgba(201, 162, 39, 0.1)' : 'var(--bg-surface)' }}>{v.barbero || '-'}</td>
                                                <td style={{ ...tdStyle, background: selectedVenta?.id === v.id ? 'rgba(201, 162, 39, 0.1)' : 'var(--bg-surface)' }}>
                                                    <span className={`badge ${v.metodo_pago === 'Efectivo' ? 'badge-success' :
                                                        v.metodo_pago === 'Tarjeta' ? 'badge-info' : 'badge-warning'
                                                        }`}>
                                                        {v.metodo_pago}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, background: selectedVenta?.id === v.id ? 'rgba(201, 162, 39, 0.1)' : 'var(--bg-surface)' }}>${v.total_venta.toFixed(2)}</td>
                                                <td style={{ ...tdStyle, background: selectedVenta?.id === v.id ? 'rgba(201, 162, 39, 0.1)' : 'var(--bg-surface)' }}>
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => verDetalle(v.id)}
                                                    >
                                                        <Icon name="eye" size={16} />
                                                        <span>Ver</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Panel de Detalle */}
                {selectedVenta && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>Detalle Venta #{selectedVenta.id}</h2>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => { setSelectedVenta(null); setDetalles([]); }}
                            >
                                <Icon name="x-circle" size={16} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <strong style={{ color: 'var(--text-main)' }}>Barbero:</strong> {selectedVenta.barbero || 'Sin asignar'}<br />
                                <strong style={{ color: 'var(--text-main)' }}>Método:</strong> {selectedVenta.metodo_pago}<br />
                                <strong style={{ color: 'var(--text-main)' }}>Hora:</strong> {new Date(selectedVenta.fecha).toLocaleTimeString('es-MX')}
                            </p>
                        </div>

                        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Items Vendidos:
                        </h4>

                        {detalles.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>Sin detalles</p>
                        ) : (
                            <div>
                                {detalles.map((d, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '0.75rem',
                                        background: 'var(--bg-input)',
                                        borderRadius: '12px',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <div>
                                            <strong style={{ color: 'var(--text-main)' }}>{d.nombre_servicio || d.producto}</strong>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {d.cantidad} x ${d.precio_unitario.toFixed(2)}
                                            </div>
                                        </div>
                                        <div style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                            ${d.subtotal.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '1.1rem',
                            fontWeight: 700
                        }}>
                            <span style={{ color: 'var(--text-main)' }}>Total:</span>
                            <span style={{ color: 'var(--accent-primary)' }}>${selectedVenta.total_venta.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
