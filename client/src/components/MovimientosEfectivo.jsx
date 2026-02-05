import Icon from './Icon';
import './MovimientosEfectivo.css';

export default function MovimientosEfectivo({ movimientos }) {
    if (!movimientos) return null;

    const { entradas = [], salidas = [] } = movimientos;

    return (
        <div className="movimientos-professional">
            {entradas.length > 0 && (
                <div className="movimientos-section-pro">
                    <div className="section-title-mov">
                        <Icon name="arrow-down-circle" size={20} color="#16a34a" />
                        <h3>Entradas de Efectivo</h3>
                    </div>
                    <table className="mov-table-pro">
                        <thead>
                            <tr>
                                <th className="hora-header">Hora</th>
                                <th>Descripción</th>
                                <th className="monto-header">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entradas.map((entrada, idx) => {
                                const fecha = new Date(entrada.fecha);
                                const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <tr key={idx}>
                                        <td className="hora-cell">{hora}</td>
                                        <td className="desc-cell">{entrada.descripcion}</td>
                                        <td className="monto-cell entrada-amount">+${entrada.monto.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {salidas.length > 0 && (
                <div className="movimientos-section-pro">
                    <div className="section-title-mov">
                        <Icon name="arrow-up-circle" size={20} color="#dc2626" />
                        <h3>Salidas de Efectivo</h3>
                    </div>
                    <table className="mov-table-pro">
                        <thead>
                            <tr>
                                <th className="hora-header">Hora</th>
                                <th>Descripción</th>
                                <th className="monto-header">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salidas.map((salida, idx) => {
                                const fecha = new Date(salida.fecha);
                                const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <tr key={idx}>
                                        <td className="hora-cell">{hora}</td>
                                        <td className="desc-cell">{salida.descripcion}</td>
                                        <td className="monto-cell salida-amount">-${salida.monto.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {entradas.length === 0 && salidas.length === 0 && (
                <p className="no-movimientos-pro">Sin movimientos de efectivo registrados</p>
            )}
        </div>
    );
}
