import Icon from './Icon';
import './DineroCajaDesglose.css';

export default function DineroCajaDesglose({ dineroEnCaja }) {
    if (!dineroEnCaja) return null;

    return (
        <div className="dinero-caja-professional">
            <div className="section-header">
                <div className="header-icon">
                    <Icon name="cash" size={20} color="#4f46e5" />
                </div>
                <h3>Dinero en Caja</h3>
            </div>

            <table className="desglose-table-pro">
                <tbody>
                    <tr>
                        <td className="label-cell">Fondo de caja</td>
                        <td className="amount-cell">${dineroEnCaja.fondo_inicial?.toFixed(2) || '0.00'}</td>
                    </tr>
                    <tr className="positive-row">
                        <td className="label-cell">
                            <Icon name="plus" size={16} color="#16a34a" />
                            <span>Ventas en Efectivo</span>
                        </td>
                        <td className="amount-cell positive">${dineroEnCaja.ventas_efectivo?.toFixed(2) || '0.00'}</td>
                    </tr>
                    {dineroEnCaja.abonos_efectivo > 0 && (
                        <tr className="positive-row">
                            <td className="label-cell">
                                <Icon name="plus" size={16} color="#16a34a" />
                                <span>Abonos en efectivo</span>
                            </td>
                            <td className="amount-cell positive">${dineroEnCaja.abonos_efectivo.toFixed(2)}</td>
                        </tr>
                    )}
                    {dineroEnCaja.entradas > 0 && (
                        <tr className="positive-row">
                            <td className="label-cell">
                                <Icon name="arrow-down-circle" size={16} color="#16a34a" />
                                <span>Entradas</span>
                            </td>
                            <td className="amount-cell positive">${dineroEnCaja.entradas.toFixed(2)}</td>
                        </tr>
                    )}
                    {dineroEnCaja.salidas > 0 && (
                        <tr className="negative-row">
                            <td className="label-cell">
                                <Icon name="arrow-up-circle" size={16} color="#dc2626" />
                                <span>Salidas</span>
                            </td>
                            <td className="amount-cell negative">${dineroEnCaja.salidas.toFixed(2)}</td>
                        </tr>
                    )}
                    {dineroEnCaja.devoluciones > 0 && (
                        <tr className="negative-row">
                            <td className="label-cell">
                                <Icon name="arrow-up-circle" size={16} color="#dc2626" />
                                <span>Devoluciones en efectivo</span>
                            </td>
                            <td className="amount-cell negative">${dineroEnCaja.devoluciones.toFixed(2)}</td>
                        </tr>
                    )}
                    <tr className="total-row">
                        <td className="label-cell"><strong>Total esperado</strong></td>
                        <td className="amount-cell total-amount">
                            <strong>${dineroEnCaja.total_esperado?.toFixed(2) || '0.00'}</strong>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
