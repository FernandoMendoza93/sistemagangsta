import { useState, useEffect } from 'react';
import { reportesService } from '../services/api';

export default function ReportesPage() {
    const [desde, setDesde] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
    const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
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
            alert('Error al exportar');
        } finally {
            setExporting(false);
        }
    };

    const totalIngresos = ventas.reduce((sum, v) => sum + v.ingresos, 0);
    const totalComisiones = comisiones.reduce((sum, c) => sum + c.total_comision, 0);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">📈 Reportes</h1>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="date" className="form-input" style={{ width: 'auto' }} value={desde} onChange={e => setDesde(e.target.value)} />
                    <span>a</span>
                    <input type="date" className="form-input" style={{ width: 'auto' }} value={hasta} onChange={e => setHasta(e.target.value)} />
                    <button className="btn btn-primary" onClick={exportarExcel} disabled={exporting}>
                        {exporting ? '⏳ Exportando...' : '📥 Excel'}
                    </button>
                </div>
            </div>

            <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-value">${totalIngresos.toFixed(2)}</div>
                    <div className="stat-label">Ingresos Totales</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">${totalComisiones.toFixed(2)}</div>
                    <div className="stat-label">Comisiones Generadas</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{ventas.reduce((sum, v) => sum + v.total_ventas, 0)}</div>
                    <div className="stat-label">Total de Ventas</div>
                </div>
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {/* Comisiones por Barbero */}
                <div className="card">
                    <h2 className="card-title" style={{ marginBottom: '1rem' }}>💎 Comisiones por Barbero</h2>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr><th>Barbero</th><th>Servicios</th><th>Total</th><th>Pendiente</th></tr>
                            </thead>
                            <tbody>
                                {comisiones.map((c, i) => (
                                    <tr key={i}>
                                        <td><strong>{c.barbero}</strong></td>
                                        <td>{c.servicios}</td>
                                        <td>${c.total_comision?.toFixed(2)}</td>
                                        <td><span className="badge badge-warning">${c.pendiente?.toFixed(2)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Servicios Populares */}
                <div className="card">
                    <h2 className="card-title" style={{ marginBottom: '1rem' }}>✂️ Servicios Más Vendidos</h2>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr><th>Servicio</th><th>Cantidad</th><th>Ingresos</th></tr>
                            </thead>
                            <tbody>
                                {servicios.map((s, i) => (
                                    <tr key={i}>
                                        <td><strong>{s.nombre_servicio}</strong></td>
                                        <td>{s.cantidad}</td>
                                        <td className="cart-item-price">${s.ingresos?.toFixed(2)}</td>
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
