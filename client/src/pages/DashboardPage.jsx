import { useState, useEffect } from 'react';
import { ventasService, productosService, barberosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function DashboardPage() {
    const { user, isEncargado } = useAuth();
    const [resumen, setResumen] = useState(null);
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [resumenRes, alertasRes] = await Promise.all([
                ventasService.getResumenHoy(),
                isEncargado() ? productosService.getAlertas() : Promise.resolve({ data: [] })
            ]);
            setResumen(resumenRes.data);
            setAlertas(alertasRes.data);
        } catch (error) {
            console.error('Error cargando dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Bienvenido, {user?.nombre}</h1>
                    <p className="page-subtitle">Resumen del día - {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            <div className="card-grid">
                <div className="stat-card stat-card-revenue">
                    <div className="stat-icon">
                        <Icon name="dollar-circle" size={32} color="#2563eb" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">${resumen?.ingresos_totales?.toFixed(2) || '0.00'}</div>
                        <div className="stat-label">Ingresos del Día</div>
                    </div>
                </div>

                <div className="stat-card stat-card-sales">
                    <div className="stat-icon">
                        <Icon name="shopping-cart" size={32} color="#16a34a" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{resumen?.total_ventas || 0}</div>
                        <div className="stat-label">Ventas Realizadas</div>
                    </div>
                </div>

                <div className="stat-card stat-card-cash">
                    <div className="stat-icon">
                        <Icon name="cash" size={32} color="#0891b2" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">${resumen?.efectivo?.toFixed(2) || '0.00'}</div>
                        <div className="stat-label">Efectivo</div>
                    </div>
                </div>

                <div className="stat-card stat-card-card">
                    <div className="stat-icon">
                        <Icon name="credit-card" size={32} color="#7c3aed" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">${resumen?.tarjeta?.toFixed(2) || '0.00'}</div>
                        <div className="stat-label">Tarjeta</div>
                    </div>
                </div>
            </div>

            {alertas.length > 0 && isEncargado() && (
                <div className="card stock-alerts-card">
                    <div className="card-header">
                        <div className="card-title-wrapper">
                            <Icon name="alert-circle" size={24} color="#f59e0b" />
                            <h2 className="card-title">Alertas de Stock</h2>
                        </div>
                    </div>
                    <div className="stock-alerts-list">
                        {alertas.map(p => (
                            <div key={p.id} className="stock-alert-item">
                                <div className="alert-icon">
                                    <Icon name="package" size={20} color="#dc2626" />
                                </div>
                                <div className="alert-info">
                                    <strong>{p.nombre}</strong>
                                    <span className="alert-details">Stock: {p.stock_actual} / Mínimo: {p.stock_minimo}</span>
                                </div>
                                <span className="badge badge-danger">Bajo</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
