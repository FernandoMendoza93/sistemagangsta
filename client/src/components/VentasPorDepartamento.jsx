import Icon from './Icon';
import './VentasPorDepartamento.css';

export default function VentasPorDepartamento({ rentabilidad }) {
    if (!rentabilidad) return null;

    const { servicios, productos } = rentabilidad;
    const hayDatos = (servicios && servicios.length > 0) || (productos && productos.length > 0);

    if (!hayDatos) {
        return (
            <div className="ventas-dept-professional">
                <div className="section-header">
                    <div className="header-icon">
                        <Icon name="bar-chart" size={20} color="#0891b2" />
                    </div>
                    <h3>Ventas por Departamento</h3>
                </div>
                <p className="no-data-pro">Sin datos de rentabilidad</p>
            </div>
        );
    }

    return (
        <div className="ventas-dept-professional">
            <div className="section-header">
                <div className="header-icon">
                    <Icon name="bar-chart" size={20} color="#0891b2" />
                </div>
                <h3>Ventas por Departamento</h3>
            </div>

            {servicios && servicios.length > 0 && (
                <div className="dept-section">
                    <h4 className="dept-subtitle">Servicios</h4>
                    <table className="dept-table-pro">
                        <thead>
                            <tr>
                                <th>Servicio</th>
                                <th className="centered">Cantidad</th>
                                <th className="right-align">Ventas</th>
                                <th className="right-align">Ganancia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {servicios.map((s, idx) => (
                                <tr key={idx}>
                                    <td className="dept-name">{s.nombre}</td>
                                    <td className="centered">{s.cantidad}</td>
                                    <td className="amount-cell">${s.total_ventas.toFixed(2)}</td>
                                    <td className="ganancia-cell">${s.ganancia.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {productos && productos.length > 0 && (
                <div className="dept-section">
                    <h4 className="dept-subtitle">Productos</h4>
                    <table className="dept-table-pro">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th className="centered">Cantidad</th>
                                <th className="right-align">Ventas</th>
                                <th className="right-align">Ganancia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map((p, idx) => (
                                <tr key={idx}>
                                    <td className="dept-name">
                                        <span className="dept-badge-pro">{p.departamento}</span> {p.nombre}
                                    </td>
                                    <td className="centered">{p.cantidad}</td>
                                    <td className="amount-cell">${p.total_ventas.toFixed(2)}</td>
                                    <td className="ganancia-cell">${p.ganancia.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
