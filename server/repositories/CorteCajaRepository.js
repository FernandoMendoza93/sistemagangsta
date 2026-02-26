export class CorteCajaRepository {
    constructor(dbQuery) {
        this.dbQuery = dbQuery;
    }

    async findOpen() {
        return await this.dbQuery.get(`
            SELECT cc.*, u.nombre as encargado 
            FROM cortes_caja cc
            JOIN usuarios u ON cc.id_encargado = u.id
            WHERE cc.fecha_cierre IS NULL 
            ORDER BY cc.fecha_apertura DESC 
            LIMIT 1
        `);
    }

    async create(montoInicial, idEncargado) {
        return await this.dbQuery.run('INSERT INTO cortes_caja (monto_inicial, id_encargado) VALUES (?, ?)', [montoInicial, idEncargado]);
    }

    async update(id, { ingresos, montoReal, diferencia, notas }) {
        return await this.dbQuery.run(`
            UPDATE cortes_caja 
            SET fecha_cierre = datetime('now','localtime'), 
                ingresos_calculados = ?, 
                monto_real_fisico = ?, 
                diferencia = ?, 
                notas = ? 
            WHERE id = ?
        `, [ingresos, montoReal, diferencia, notas, id]);
    }

    async getHistory(limit = 30) {
        return await this.dbQuery.all(`
            SELECT cc.*, u.nombre as encargado 
            FROM cortes_caja cc
            JOIN usuarios u ON cc.id_encargado = u.id
            WHERE cc.fecha_cierre IS NOT NULL 
            ORDER BY cc.fecha_apertura DESC 
            LIMIT ?
        `, [limit]);
    }

    async getIngresosEfectivo(fechaApertura) {
        const result = await this.dbQuery.get(`
            SELECT COALESCE(SUM(CASE WHEN metodo_pago = 'Efectivo' THEN total_venta ELSE 0 END), 0) as efectivo
            FROM ventas_cabecera 
            WHERE fecha >= ? AND estado_corte_caja = 0 AND estado = 'completada'
        `, [fechaApertura]);
        return result?.efectivo || 0;
    }

    async marcarVentasCerradas(fechaApertura) {
        return await this.dbQuery.run(`
            UPDATE ventas_cabecera 
            SET estado_corte_caja = 1 
            WHERE fecha >= ? AND estado_corte_caja = 0 AND estado = 'completada'
        `, [fechaApertura]);
    }

    /**
     * Obtener desglose de ventas por método de pago
     */
    async getDesglosePorMetodoPago(fechaApertura) {
        return await this.dbQuery.all(`
            SELECT 
                metodo_pago,
                COUNT(*) as cantidad_transacciones,
                COALESCE(SUM(total_venta), 0) as total
            FROM ventas_cabecera 
            WHERE fecha >= ? AND estado_corte_caja = 0 AND estado = 'completada'
            GROUP BY metodo_pago
        `, [fechaApertura]);
    }

    /**
     * Obtener rentabilidad por departamento (Servicios vs Productos)
     * Calcula total de ventas y ganancia (precio_venta - costo)
     */
    async getRentabilidadPorDepartamento(fechaApertura) {
        // Servicios
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
            WHERE vc.fecha >= ? AND vc.estado_corte_caja = 0 AND vc.estado = 'completada' AND vd.id_servicio IS NOT NULL
            GROUP BY s.id, s.nombre_servicio
        `, [fechaApertura]);

        // Productos
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
            WHERE vc.fecha >= ? AND vc.estado_corte_caja = 0 AND vc.estado = 'completada' AND vd.id_producto IS NOT NULL
            GROUP BY c.id, p.id, c.nombre, p.nombre
        `, [fechaApertura]);

        return { servicios, productos };
    }

    /**
     * Obtener total de abonos en efectivo (si existe esa funcionalidad)
     */
    async getAbonosEfectivo(fechaApertura) {
        // Placeholder - implementar si tienes tabla de abonos
        return 0;
    }

    /**
     * Obtener total de devoluciones en efectivo
     */
    async getDevolucionesEfectivo(fechaApertura) {
        // Placeholder - implementar si tienes tabla de devoluciones
        return 0;
    }

    /**
     * Actualizar método create para incluir hora y modo
     */
    async createWithDetails(montoInicial, idEncargado, modoCierre = 'transparente') {
        const now = new Date();
        const hora = now.toTimeString().substring(0, 8); // HH:MM:SS

        return await this.dbQuery.run(`
            INSERT INTO cortes_caja (
                monto_inicial, 
                id_encargado, 
                modo_cierre,
                hora_apertura
            ) VALUES (?, ?, ?, ?)
        `, [montoInicial, idEncargado, modoCierre, hora]);
    }

    /**
     * Actualizar método update para incluir totales calculados
     */
    async updateWithTotals(id, data) {
        const now = new Date();
        const hora = now.toTimeString().substring(0, 8);

        return await this.dbQuery.run(`
            UPDATE cortes_caja 
            SET 
                fecha_cierre = datetime('now','localtime'),
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
            WHERE id = ?
        `, [
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
            id
        ]);
    }
}
