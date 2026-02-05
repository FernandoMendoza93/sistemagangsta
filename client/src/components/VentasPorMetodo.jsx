import Icon from './Icon';
import './VentasPorMetodo.css';

export default function VentasPorMetodo({ ventas }) {
    if (!ventas || ventas.length === 0) {
        return (
            <div className="ventas-metodo-professional">
                <div className="section-header">
                    <div className="header-icon">
                        <Icon name="credit-card" size={20} color="#2563eb" />
                    </div>
                    <h3>Ventas por Método de Pago</h3>
                </div>
                <p className="no-data-pro">Sin ventas registradas</p>
            </div>
        );
    }

    const total = ventas.reduce((sum, v) => sum + v.total, 0);

    return (
        <div className="ventas-metodo-professional">
            <div className="section-header">
                <div className="header-icon">
                    <Icon name="credit-card" size={20} color="#2563eb" />
                </div>
                <h3>Ventas por Método de Pago</h3>
            </div>

            <table className="metodo-table-pro">
                <tbody>
                    {ventas.map((venta, idx) => (
                        <tr key={idx}>
                            <td className="metodo-name-cell">{venta.metodo_pago}</td>
                            <td className="metodo-count-cell">{venta.cantidad_transacciones} transacción(es)</td>
                            <td className="metodo-amount-cell">${venta.total.toFixed(2)}</td>
                        </tr>
                    ))}
                    <tr className="total-row-metodo">
                        <td colSpan="2" className="total-label"><strong>Total</strong></td>
                        <td className="metodo-amount-cell"><strong>${total.toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
