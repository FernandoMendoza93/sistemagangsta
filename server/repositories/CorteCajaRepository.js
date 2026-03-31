import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Mexico_City");

export class CorteCajaRepository {
    constructor(dbQuery, barberiaId) {
        this.dbQuery = dbQuery;
        this.barberiaId = barberiaId;
    }

    async findOpen() {
        return await this.dbQuery.get(`
            SELECT cc.*, u.nombre as encargado 
            FROM cortes_caja cc
            JOIN usuarios u ON cc.id_encargado = u.id
            WHERE cc.fecha_cierre IS NULL AND cc.barberia_id = ?
            ORDER BY cc.fecha_apertura DESC 
            LIMIT 1
        `, [this.barberiaId]);
    }

    async createWithDetails(montoInicial, idEncargado, modoCierre = 'transparente') {
        const mxNow = dayjs().tz("America/Mexico_City");
        const fecha = mxNow.format("YYYY-MM-DD");
        const hora = mxNow.format("HH:mm:ss");

        return await this.dbQuery.run(`
            INSERT INTO cortes_caja (
                monto_inicial, 
                id_encargado, 
                modo_cierre,
                fecha_apertura,
                hora_apertura,
                barberia_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [montoInicial, idEncargado, modoCierre, fecha, hora, this.barberiaId]);
    }

    async updateWithTotals(id, data) {
        const mxDateObj = dayjs().tz("America/Mexico_City");
        const mxDateTime = mxDateObj.format("YYYY-MM-DD HH:mm:ss");
        const hora = mxDateObj.format("HH:mm:ss");

        return await this.dbQuery.run(`
            UPDATE cortes_caja 
            SET 
                fecha_cierre = ?,
                hora_cierre = ?,
                ingresos_calculados = ?,
                monto_real_fisico = ?,
                diferencia = ?,
                notas = ?,
                total_ventas = ?,
                total_ganancias = ?,
                abonos_efectivo = ?,
                devoluciones_efectivo = ?,
                entradas_efectivo_total = ?
            WHERE id = ? AND barberia_id = ?
        `, [
            mxDateTime,
            hora,
            data.ingresos || 0,
            data.montoReal || 0,
            data.diferencia || 0,
            data.notas || '',
            data.totalVentas || 0,
            data.totalGanancias || 0,
            data.abonos || 0,
            data.devoluciones || 0,
            data.entradas || 0,
            id,
            this.barberiaId
        ]);
    }

    async getHistory(limit = 7) {
        const cleanLimit = parseInt(limit, 10) || 7;
        return await this.dbQuery.all(`
            SELECT cc.*, u.nombre as nombre_encargado 
            FROM cortes_caja cc
            JOIN usuarios u ON cc.id_encargado = u.id
            WHERE cc.barberia_id = ?
            ORDER BY cc.fecha_apertura DESC 
            LIMIT ?
        `, [this.barberiaId, cleanLimit]);
    }

    async getIngresosEfectivo(fechaApertura) {
        const result = await this.dbQuery.get(`
            SELECT COALESCE(SUM(CASE WHEN metodo_pago = 'Efectivo' THEN total_venta ELSE 0 END), 0) as efectivo
            FROM ventas_cabecera 
            WHERE fecha >= ? AND estado_corte_caja = 0 AND estado = 'completada' AND barberia_id = ?
        `, [fechaApertura, this.barberiaId]);
        return result?.efectivo || 0;
    }

    async marcarVentasCerradas(fechaApertura) {
        return await this.dbQuery.run(`
            UPDATE ventas_cabecera 
            SET estado_corte_caja = 1 
            WHERE fecha >= ? AND estado_corte_caja = 0 AND estado = 'completada' AND barberia_id = ?
        `, [fechaApertura, this.barberiaId]);
    }

    async getDesglosePorMetodoPago(fechaApertura) {
        return await this.dbQuery.all(`
            SELECT 
                metodo_pago,
                COUNT(*) as cantidad_transacciones,
                COALESCE(SUM(total_venta), 0) as total
            FROM ventas_cabecera 
            WHERE fecha >= ? AND estado_corte_caja = 0 AND estado = 'completada' AND barberia_id = ?
            GROUP BY metodo_pago
        `, [fechaApertura, this.barberiaId]);
    }

    async getRentabilidadPorDepartamento(fechaApertura) {
        const servicios = await this.dbQuery.all(`
            SELECT 
                'Servicios' as departamento,
                s.nombre_servicio as nombre,
                COUNT(vd.id) as cantidad,
                COALESCE(SUM(vd.subtotal), 0) as total_ventas,
                COALESCE(SUM(vd.subtotal), 0) as ganancia
            FROM ventas_detalle vd
            JOIN ventas_cabecera vc ON vd.id_venta_cabecera = vc.id
            LEFT JOIN servicios s ON vd.id_servicio = s.id
            WHERE vc.fecha >= ? AND vc.estado_corte_caja = 0 AND vc.estado = 'completada' AND vd.id_servicio IS NOT NULL AND vc.barberia_id = ?
            GROUP BY s.id, s.nombre_servicio
        `, [fechaApertura, this.barberiaId]);

        const productos = await this.dbQuery.all(`
            SELECT 
                c.nombre as departamento,
                p.nombre as nombre,
                SUM(vd.cantidad) as cantidad,
                COALESCE(SUM(vd.subtotal), 0) as total_ventas,
                COALESCE(SUM((vd.precio_unitario - p.precio_costo) * vd.cantidad), 0) as ganancia
            FROM ventas_detalle vd
            JOIN ventas_cabecera vc ON vd.id_venta_cabecera = vc.id
            LEFT JOIN productos p ON vd.id_producto = p.id
            LEFT JOIN categorias c ON p.id_categoria = c.id
            WHERE vc.fecha >= ? AND vc.estado_corte_caja = 0 AND vc.estado = 'completada' AND vd.id_producto IS NOT NULL AND vc.barberia_id = ?
            GROUP BY c.id, p.id, c.nombre, p.nombre
        `, [fechaApertura, this.barberiaId]);

        return { servicios, productos };
    }

    async getAbonosEfectivo(fechaApertura) {
        return 0;
    }

    async getDevolucionesEfectivo(fechaApertura) {
        return 0;
    }
}
