import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { reportesService } from '../services/api';

export default function ReportesPage() {
    const [desde, setDesde] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [hasta, setHasta] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [ventas, setVentas] = useState([]);
    const [comisiones, setComisiones] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => { loadData(); }, [desde, hasta]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ventasRes, comisionesRes, serviciosRes] = await Promise.all([
                reportesService.getVentas(desde, hasta),
                reportesService.getComisiones(desde, hasta),
                reportesService.getServicios(desde, hasta)
            ]);
            setVentas(ventasRes.data);
            setComisiones(comisionesRes.data);
            setServicios(serviciosRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportarExcel = async () => {
        setExporting(true);
        try {
            const res = await reportesService.exportarExcel(desde, hasta);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_${desde}_${hasta}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error('Error al exportar');
        } finally {
            setExporting(false);
        }
    };

    const totalIngresos = ventas.reduce((sum, v) => sum + v.ingresos, 0);
    const totalComisiones = comisiones.reduce((sum, c) => sum + c.total_comision, 0);

    const cardStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px var(--shadow-color)' };
    const thStyle = { background: 'var(--bg-input)', color: 'var(--text-muted)', padding: '0.75rem 1.25rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' };
    const tdStyle = { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">📈 Reportes</h1>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="date" className="form-input" style={{ width: 'auto' }} value={desde} onChange={e => setDesde(e.target.value)} />
                    <span style={{ color: 'var(--text-muted)' }}>a</span>
                    <input type="date" className="form-input" style={{ width: 'auto' }} value={hasta} onChange={e => setHasta(e.target.value)} />
                    <button className="btn btn-primary" onClick={exportarExcel} disabled={exporting}>
                        {exporting ? '⏳ Exportando...' : '📥 Excel'}
                    </button>
                </div>
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.5rem' }}>
                <div style={{ ...cardStyle, textAlign: 'center', padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>${totalIngresos.toFixed(2)}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ingresos Totales</div>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>${totalComisiones.toFixed(2)}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Comisiones Generadas</div>
                </div>
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {/* Comisiones por Barbero */}
                <div style={cardStyle}>
                    <h2 style={{ margin: 0, marginBottom: '1rem', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>💎 Comisiones por Barbero</h2>
                    <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Barbero</th>
                                    <th style={thStyle}>Servicios</th>
                                    <th style={thStyle}>Total</th>
                                    <th style={thStyle}>Pendiente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comisiones.map((c, i) => (
                                    <tr key={i}>
                                        <td style={{ ...tdStyle, fontWeight: 700 }}>{c.barbero}</td>
                                        <td style={tdStyle}>{c.servicios}</td>
                                        <td style={tdStyle}>${c.total_comision?.toFixed(2)}</td>
                                        <td style={tdStyle}><span className="badge badge-warning">${c.pendiente?.toFixed(2)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Servicios Populares */}
                <div style={cardStyle}>
                    <h2 style={{ margin: 0, marginBottom: '1rem', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>✂️ Servicios Más Vendidos</h2>
                    <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Servicio</th>
                                    <th style={thStyle}>Cantidad</th>
                                    <th style={thStyle}>Ingresos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {servicios.map((s, i) => (
                                    <tr key={i}>
                                        <td style={{ ...tdStyle, fontWeight: 700 }}>{s.nombre_servicio}</td>
                                        <td style={tdStyle}>{s.cantidad}</td>
                                        <td style={{ ...tdStyle, color: 'var(--accent-primary)', fontWeight: 600 }}>${s.ingresos?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
