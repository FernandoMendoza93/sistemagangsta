import Icon from './Icon';
import './CorteResumen.css';

export default function CorteResumen({ totalVentas, totalComisiones, totalGanancia, dineroEsperado }) {
    return (
        <div className="corte-resumen-professional">
            <div className="metric-card metric-sales">
                <div className="metric-icon-wrapper icon-blue">
                    <Icon name="dollar-circle" size={24} color="var(--accent-primary)" />
                </div>
                <div className="metric-content">
                    <span className="metric-label">Ventas Totales</span>
                    <span className="metric-value">${totalVentas?.toFixed(2) || '0.00'}</span>
                </div>
            </div>

            <div className="metric-card metric-comisiones">
                <div className="metric-icon-wrapper icon-orange">
                    <Icon name="users" size={24} color="#f97316" />
                </div>
                <div className="metric-content">
                    <span className="metric-label">Comisiones</span>
                    <span className="metric-value">-${totalComisiones?.toFixed(2) || '0.00'}</span>
                </div>
            </div>

            <div className="metric-card metric-profit">
                <div className="metric-icon-wrapper icon-green">
                    <Icon name="trending-up" size={24} color="#16a34a" />
                </div>
                <div className="metric-content">
                    <span className="metric-label">Utilidad Neta</span>
                    <span className="metric-value">${totalGanancia?.toFixed(2) || '0.00'}</span>
                </div>
            </div>

            <div className="metric-card metric-expected">
                <div className="metric-icon-wrapper icon-indigo">
                    <Icon name="cash" size={24} color="var(--accent-primary)" />
                </div>
                <div className="metric-content">
                    <span className="metric-label">Efectivo Esperado</span>
                    <span className="metric-value">${dineroEsperado?.toFixed(2) || '0.00'}</span>
                </div>
            </div>
        </div>
    );
}
