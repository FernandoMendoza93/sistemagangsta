import express from 'express';
import { verifyToken, requireRole, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/ventas - Listar ventas del día
router.get('/', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { fecha, desde, hasta } = req.query;

        let query = `
      SELECT v.id, v.fecha, v.total_venta, v.metodo_pago, v.notas,
             b.id as id_barbero, u.nombre as barbero
      FROM ventas_cabecera v
      LEFT JOIN barberos b ON v.id_barbero = b.id
      LEFT JOIN usuarios u ON b.id_usuario = u.id
    `;

        const params = [];
        const conditions = [];

        if (fecha) {
            conditions.push("date(v.fecha) = date(?)");
            params.push(fecha);
        } else if (desde && hasta) {
            conditions.push("date(v.fecha) BETWEEN date(?) AND date(?)");
            params.push(desde, hasta);
        } else {
            // Por defecto, ventas de hoy
            conditions.push("date(v.fecha) = date('now', 'localtime')");
        }

        // Si es barbero, solo ve sus ventas
        if (req.user.rol === ROLES.BARBERO) {
            const barbero = db.prepare('SELECT id FROM barberos WHERE id_usuario = ?').get(req.user.id);
            if (barbero) {
                conditions.push('v.id_barbero = ?');
                params.push(barbero.id);
            }
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY v.fecha DESC';

        const ventas = db.prepare(query).all(...params);

        res.json(ventas);
    } catch (error) {
        console.error('Error listando ventas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/ventas/resumen/hoy - Resumen del día (DEBE IR ANTES DE /:id)
router.get('/resumen/hoy', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        const resumen = db.prepare(`
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total_venta), 0) as ingresos_totales,
        COALESCE(SUM(CASE WHEN metodo_pago = 'Efectivo' THEN total_venta ELSE 0 END), 0) as efectivo,
        COALESCE(SUM(CASE WHEN metodo_pago = 'Tarjeta' THEN total_venta ELSE 0 END), 0) as tarjeta,
        COALESCE(SUM(CASE WHEN metodo_pago = 'Transferencia' THEN total_venta ELSE 0 END), 0) as transferencia
      FROM ventas_cabecera
      WHERE date(fecha) = date('now', 'localtime')
    `).get();

        res.json(resumen);
    } catch (error) {
        console.error('Error obteniendo resumen:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/ventas/:id - Detalle de una venta
router.get('/:id', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const venta = db.prepare(`
      SELECT v.id, v.fecha, v.total_venta, v.metodo_pago, v.notas,
             b.id as id_barbero, u.nombre as barbero
      FROM ventas_cabecera v
      LEFT JOIN barberos b ON v.id_barbero = b.id
      LEFT JOIN usuarios u ON b.id_usuario = u.id
      WHERE v.id = ?
    `).get(id);

        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const detalles = db.prepare(`
      SELECT vd.id, vd.cantidad, vd.precio_unitario, vd.subtotal,
             s.nombre_servicio, p.nombre as producto
      FROM ventas_detalle vd
      LEFT JOIN servicios s ON vd.id_servicio = s.id
      LEFT JOIN productos p ON vd.id_producto = p.id
      WHERE vd.id_venta_cabecera = ?
    `).all(id);

        res.json({ ...venta, detalles });
    } catch (error) {
        console.error('Error obteniendo venta:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/ventas - Crear nueva venta
router.post('/', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id_barbero, metodo_pago, notas, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'La venta debe tener al menos un item' });
        }

        // Validar stock de productos
        for (const item of items) {
            if (item.id_producto) {
                const producto = db.prepare('SELECT stock_actual FROM productos WHERE id = ?').get(item.id_producto);
                if (!producto) {
                    return res.status(400).json({ error: `Producto ${item.id_producto} no encontrado` });
                }
                if (producto.stock_actual < item.cantidad) {
                    return res.status(400).json({
                        error: `Stock insuficiente para el producto. Disponible: ${producto.stock_actual}`
                    });
                }
            }
        }

        // Calcular total
        let totalVenta = 0;
        for (const item of items) {
            totalVenta += item.precio_unitario * item.cantidad;
        }

        // Insertar cabecera
        const result = db.prepare(`
      INSERT INTO ventas_cabecera (id_barbero, total_venta, metodo_pago, notas)
      VALUES (?, ?, ?, ?)
    `).run(id_barbero || null, totalVenta, metodo_pago || 'Efectivo', notas || '');

        const ventaId = result.lastInsertRowid;

        // Insertar detalles y procesar
        for (const item of items) {
            const subtotal = item.precio_unitario * item.cantidad;

            db.prepare(`
        INSERT INTO ventas_detalle (id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(ventaId, item.id_servicio || null, item.id_producto || null, item.cantidad, item.precio_unitario, subtotal);

            const detalleId = db.prepare('SELECT last_insert_rowid() as id').get().id;

            // Si es producto, reducir stock
            if (item.id_producto) {
                db.prepare(`
          UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?
        `).run(item.cantidad, item.id_producto);

                db.prepare(`
          INSERT INTO movimientos_inventario (id_producto, tipo, cantidad, motivo, id_usuario)
          VALUES (?, 'Salida', ?, 'Venta #${ventaId}', ?)
        `).run(item.id_producto, item.cantidad, req.user.id);
            }

            // Si es servicio y hay barbero, calcular comisión
            if (item.id_servicio && id_barbero) {
                const barbero = db.prepare('SELECT porcentaje_comision FROM barberos WHERE id = ?').get(id_barbero);
                if (barbero) {
                    const comision = subtotal * barbero.porcentaje_comision;
                    db.prepare(`
            INSERT INTO comisiones_pendientes (id_barbero, id_venta_detalle, monto)
            VALUES (?, ?, ?)
          `).run(id_barbero, detalleId, comision);
                }
            }
        }

        res.status(201).json({
            message: 'Venta registrada',
            id: ventaId,
            total: totalVenta
        });
    } catch (error) {
        console.error('Error creando venta:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;


