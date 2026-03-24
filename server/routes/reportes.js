import express from 'express';
import * as XLSX from 'xlsx';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reportes/ventas — filtrado por tenant
router.get('/ventas', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { desde, hasta } = req.query;

        let query = `
            SELECT date(v.fecha) as fecha, COUNT(*) as total_ventas,
                   SUM(v.total_venta) as ingresos,
                   SUM(CASE WHEN v.metodo_pago = 'Efectivo' THEN v.total_venta ELSE 0 END) as efectivo,
                   SUM(CASE WHEN v.metodo_pago = 'Tarjeta' THEN v.total_venta ELSE 0 END) as tarjeta
            FROM ventas_cabecera v WHERE v.estado = 'completada' AND v.barberia_id = ?
        `;
        const params = [req.barberia_id];
        if (desde) { query += ' AND date(v.fecha) >= ?'; params.push(desde); }
        if (hasta) { query += ' AND date(v.fecha) <= ?'; params.push(hasta); }
        query += ' GROUP BY date(v.fecha) ORDER BY fecha DESC';

        const ventas = await dbQuery.all(query, params);
        res.json(ventas);
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/reportes/comisiones — filtrado por tenant
router.get('/comisiones', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { desde, hasta } = req.query;

        let query = `
            SELECT u.nombre as barbero, COUNT(cp.id) as servicios,
                   SUM(cp.monto) as total_comision,
                   SUM(CASE WHEN cp.pagado = 0 THEN cp.monto ELSE 0 END) as pendiente
            FROM comisiones_pendientes cp
            JOIN barberos b ON cp.id_barbero = b.id
            JOIN usuarios u ON b.id_usuario = u.id WHERE cp.barberia_id = ?
        `;
        const params = [req.barberia_id];
        if (desde) { query += ' AND date(cp.fecha) >= ?'; params.push(desde); }
        if (hasta) { query += ' AND date(cp.fecha) <= ?'; params.push(hasta); }
        query += ' GROUP BY b.id ORDER BY total_comision DESC';

        const comisiones = await dbQuery.all(query, params);
        res.json(comisiones);
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/reportes/servicios — filtrado por tenant
router.get('/servicios', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { desde, hasta } = req.query;

        let query = `
            SELECT s.nombre_servicio, COUNT(vd.id) as cantidad,
                   SUM(vd.subtotal) as ingresos
            FROM ventas_detalle vd
            JOIN servicios s ON vd.id_servicio = s.id
            JOIN ventas_cabecera v ON vd.id_venta_cabecera = v.id
            WHERE v.estado = 'completada' AND vd.id_servicio IS NOT NULL AND v.barberia_id = ?
        `;
        const params = [req.barberia_id];
        if (desde) { query += ' AND date(v.fecha) >= ?'; params.push(desde); }
        if (hasta) { query += ' AND date(v.fecha) <= ?'; params.push(hasta); }
        query += ' GROUP BY s.id ORDER BY cantidad DESC';

        const servicios = await dbQuery.all(query, params);
        res.json(servicios);
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/reportes/excel — filtrado por tenant
router.get('/excel', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { desde, hasta } = req.query;

        let ventasQuery = `SELECT v.id, v.fecha, u.nombre as barbero, v.total_venta, v.metodo_pago
            FROM ventas_cabecera v LEFT JOIN barberos b ON v.id_barbero = b.id
            LEFT JOIN usuarios u ON b.id_usuario = u.id WHERE v.estado = 'completada' AND v.barberia_id = ?`;
        const params = [req.barberia_id];
        if (desde) { ventasQuery += ' AND date(v.fecha) >= ?'; params.push(desde); }
        if (hasta) { ventasQuery += ' AND date(v.fecha) <= ?'; params.push(hasta); }
        const ventas = await dbQuery.all(ventasQuery, params);

        const comisiones = await dbQuery.all(`
            SELECT u.nombre as barbero, SUM(cp.monto) as total,
                   SUM(CASE WHEN cp.pagado = 0 THEN cp.monto ELSE 0 END) as pendiente
            FROM comisiones_pendientes cp
            JOIN barberos b ON cp.id_barbero = b.id
            JOIN usuarios u ON b.id_usuario = u.id WHERE cp.barberia_id = ? GROUP BY b.id
        `, [req.barberia_id]);

        const inventario = await dbQuery.all(`
            SELECT p.nombre, p.stock_actual, p.stock_minimo, p.precio_costo, p.precio_venta, c.nombre as categoria
            FROM productos p LEFT JOIN categorias c ON p.id_categoria = c.id WHERE p.activo = 1 AND p.barberia_id = ?
        `, [req.barberia_id]);

        const wb = XLSX.utils.book_new();

        const wsVentas = XLSX.utils.json_to_sheet(ventas);
        XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');

        const wsComisiones = XLSX.utils.json_to_sheet(comisiones);
        XLSX.utils.book_append_sheet(wb, wsComisiones, 'Comisiones');

        const wsInventario = XLSX.utils.json_to_sheet(inventario);
        XLSX.utils.book_append_sheet(wb, wsInventario, 'Inventario');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename=reporte_${desde || 'todo'}_${hasta || 'hoy'}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Error generando Excel:', error);
        res.status(500).json({ error: 'Error generando Excel' });
    }
});

export default router;
