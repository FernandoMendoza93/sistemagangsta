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

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="header-title-wrapper">
                        <div className="title-icon">
                            <Icon name="file-text" size={28} color="#2563eb" />
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
                <div className="stat-card stat-card-revenue">
                    <div className="stat-icon">
                        <Icon name="dollar-circle" size={32} color="#2563eb" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">${getTotal().toFixed(2)}</div>
                        <div className="stat-label">Total del Día</div>
                    </div>
                </div>
                <div className="stat-card stat-card-sales">
                    <div className="stat-icon">
                        <Icon name="shopping-cart" size={32} color="#16a34a" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{ventas.length}</div>
                        <div className="stat-label">Ventas Realizadas</div>
                    </div>
                </div>
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: selectedVenta ? '1fr 380px' : '1fr' }}>
                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Lista de Ventas</h2>
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Hora</th>
                                        <th>Barbero</th>
                                        <th>Método</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ventas.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No hay ventas registradas para esta fecha
                                            </td>
                                        </tr>
                                    ) : (
                                        ventas.map(v => (
                                            <tr key={v.id} style={{
                                                background: selectedVenta?.id === v.id ? 'rgba(201, 162, 39, 0.1)' : undefined
                                            }}>
                                                <td style={{ color: '#1a1a1a' }}>{v.id}</td>
                                                <td style={{ color: '#1a1a1a' }}>{new Date(v.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td style={{ color: '#1a1a1a' }}>{v.barbero || '-'}</td>
                                                <td>
                                                    <span className={`badge ${v.metodo_pago === 'Efectivo' ? 'badge-success' :
                                                        v.metodo_pago === 'Tarjeta' ? 'badge-info' : 'badge-warning'
                                                        }`}>
                                                        {v.metodo_pago}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#1a1a1a' }}>${v.total_venta.toFixed(2)}</td>
                                                <td>
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
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Detalle Venta #{selectedVenta.id}</h2>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => { setSelectedVenta(null); setDetalles([]); }}
                            >
                                <Icon name="x-circle" size={16} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <strong>Barbero:</strong> {selectedVenta.barbero || 'Sin asignar'}<br />
                                <strong>Método:</strong> {selectedVenta.metodo_pago}<br />
                                <strong>Hora:</strong> {new Date(selectedVenta.fecha).toLocaleTimeString('es-MX')}
                            </p>
                        </div>

                        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
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
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <div>
                                            <strong style={{ color: 'var(--text-primary)' }}>{d.nombre_servicio || d.producto}</strong>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {d.cantidad} x ${d.precio_unitario.toFixed(2)}
                                            </div>
                                        </div>
                                        <div style={{ color: 'var(--primary)', fontWeight: 600 }}>
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
                            <span style={{ color: 'var(--text-primary)' }}>Total:</span>
                            <span style={{ color: 'var(--primary)' }}>${selectedVenta.total_venta.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
