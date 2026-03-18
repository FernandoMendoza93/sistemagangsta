import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Mexico_City");

const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_2024';

const router = express.Router();

// GET /api/ventas - Listar ventas del día (solo completadas) — filtrado por tenant
router.get('/', verifyToken, requireTenant, (req, res) => {
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

        const conditions = ["v.estado = 'completada'", "v.barberia_id = ?"];
        const params = [req.barberia_id];

        if (fecha) {
            conditions.push("date(v.fecha) = date(?)");
            params.push(fecha);
        } else if (desde && hasta) {
            conditions.push("date(v.fecha) BETWEEN date(?) AND date(?)");
            params.push(desde, hasta);
        } else {
            const mxDate = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
            conditions.push("date(v.fecha) = ?");
            params.push(mxDate);
        }

        if (req.user.rol === ROLES.BARBERO) {
            const barbero = db.prepare('SELECT id FROM barberos WHERE id_usuario = ? AND barberia_id = ?').get(req.user.id, req.barberia_id);
            if (barbero) {
                conditions.push('v.id_barbero = ?');
                params.push(barbero.id);
            }
        }

        query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY v.fecha DESC';

        const ventas = db.prepare(query).all(...params);
        res.json(ventas);
    } catch (error) {
        console.error('Error listando ventas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/ventas/resumen/hoy - Resumen del día (solo completadas)
router.get('/resumen/hoy', verifyToken, requireTenant, (req, res) => {
    try {
        const db = req.app.locals.db;
        const mxDate = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");

        // Aislamiento de Barbero: solo ve sus propias métricas
        let extraCondition = '';
        let extraParams = [];
        if (req.user.rol === ROLES.BARBERO) {
            const barbero = db.prepare('SELECT id FROM barberos WHERE id_usuario = ? AND barberia_id = ?').get(req.user.id, req.barberia_id);
            if (barbero) {
                extraCondition = 'AND id_barbero = ?';
                extraParams = [barbero.id];
            } else {
                // Barbero sin perfil asignado: devolver ceros
                return res.json({ total_ventas: 0, ingresos_totales: 0, efectivo: 0, tarjeta: 0, transferencia: 0 });
            }
        }

        const resumen = db.prepare(`
            SELECT 
                COUNT(*) as total_ventas,
                COALESCE(SUM(total_venta), 0) as ingresos_totales,
                COALESCE(SUM(CASE WHEN metodo_pago = 'Efectivo' THEN total_venta ELSE 0 END), 0) as efectivo,
                COALESCE(SUM(CASE WHEN metodo_pago = 'Tarjeta' THEN total_venta ELSE 0 END), 0) as tarjeta,
                COALESCE(SUM(CASE WHEN metodo_pago = 'Transferencia' THEN total_venta ELSE 0 END), 0) as transferencia
            FROM ventas_cabecera
            WHERE date(fecha) = ? AND estado = 'completada' AND barberia_id = ? ${extraCondition}
        `).get(mxDate, req.barberia_id, ...extraParams);

        res.json(resumen);
    } catch (error) {
        console.error('Error obteniendo resumen:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/ventas/resumen/semana - Ingresos reales por día (últimos 7 días)
router.get('/resumen/semana', verifyToken, requireTenant, (req, res) => {
    try {
        const db = req.app.locals.db;
        const hoy = dayjs().tz("America/Mexico_City");
        const hace7 = hoy.subtract(6, 'day').format("YYYY-MM-DD");
        const hoyStr = hoy.format("YYYY-MM-DD");

        // Aislamiento de Barbero: solo ve sus propias métricas semanales
        let extraCondition = '';
        let extraParams = [];
        if (req.user.rol === ROLES.BARBERO) {
            const barbero = db.prepare('SELECT id FROM barberos WHERE id_usuario = ? AND barberia_id = ?').get(req.user.id, req.barberia_id);
            if (barbero) {
                extraCondition = 'AND id_barbero = ?';
                extraParams = [barbero.id];
            } else {
                return res.json([]);
            }
        }

        // Get totals grouped by date for last 7 days
        const rows = db.prepare(`
            SELECT date(fecha) as dia, COALESCE(SUM(total_venta), 0) as ingresos
            FROM ventas_cabecera
            WHERE date(fecha) BETWEEN ? AND ? AND estado = 'completada' AND barberia_id = ? ${extraCondition}
            GROUP BY date(fecha)
            ORDER BY date(fecha) ASC
        `).all(hace7, hoyStr, req.barberia_id, ...extraParams);

        // Build a complete 7-day array (fill gaps with 0)
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dataMap = {};
        rows.forEach(r => { dataMap[r.dia] = r.ingresos; });

        const resultado = [];
        for (let i = 6; i >= 0; i--) {
            const d = hoy.subtract(i, 'day');
            const key = d.format("YYYY-MM-DD");
            resultado.push({
                name: dias[d.day()],
                fecha: key,
                ingresos: dataMap[key] || 0
            });
        }

        res.json(resultado);
    } catch (error) {
        console.error('Error obteniendo resumen semanal:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/ventas/:id - Detalle de una venta (verificar tenant)
router.get('/:id', verifyToken, requireTenant, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const venta = db.prepare(`
            SELECT v.id, v.fecha, v.total_venta, v.metodo_pago, v.notas,
                   b.id as id_barbero, u.nombre as barbero
            FROM ventas_cabecera v
            LEFT JOIN barberos b ON v.id_barbero = b.id
            LEFT JOIN usuarios u ON b.id_usuario = u.id
            WHERE v.id = ? AND v.barberia_id = ?
        `).get(id, req.barberia_id);

        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const detalles = db.prepare(`
            SELECT vd.id, vd.cantidad, vd.precio_unitario, vd.subtotal,
                   s.nombre_servicio, p.nombre as producto
            FROM ventas_detalle vd
            LEFT JOIN servicios s ON vd.id_servicio = s.id
            LEFT JOIN productos p ON vd.id_producto = p.id
            WHERE vd.id_venta_cabecera = ? AND vd.barberia_id = ?
        `).all(id, req.barberia_id);

        res.json({ ...venta, detalles });
    } catch (error) {
        console.error('Error obteniendo venta:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/ventas - Crear nueva venta (estado pendiente) — con barberia_id
router.post('/', verifyToken, requireTenant, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id_barbero, metodo_pago, notas, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'La venta debe tener al menos un item' });
        }

        // Validar stock de productos (filtrado por tenant)
        for (const item of items) {
            if (item.id_producto) {
                const producto = db.prepare('SELECT stock_actual FROM productos WHERE id = ? AND barberia_id = ?').get(item.id_producto, req.barberia_id);
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

        let totalVenta = 0;
        for (const item of items) {
            totalVenta += item.precio_unitario * item.cantidad;
        }

        const mxDateTime = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss");
        const result = db.prepare(`
            INSERT INTO ventas_cabecera (id_barbero, total_venta, metodo_pago, notas, estado, fecha, barberia_id)
            VALUES (?, ?, ?, ?, 'completada', ?, ?)
        `).run(id_barbero || null, totalVenta, metodo_pago || 'Efectivo', notas || '', mxDateTime, req.barberia_id);

        const ventaId = result.lastInsertRowid;

        for (const item of items) {
            const subtotal = item.precio_unitario * item.cantidad;

            db.prepare(`
                INSERT INTO ventas_detalle (id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal, barberia_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(ventaId, item.id_servicio || null, item.id_producto || null, item.cantidad, item.precio_unitario, subtotal, req.barberia_id);

            const detalleId = db.prepare('SELECT last_insert_rowid() as id').get().id;

            if (item.id_producto) {
                db.prepare('UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ? AND barberia_id = ?')
                    .run(item.cantidad, item.id_producto, req.barberia_id);

                db.prepare(`
                    INSERT INTO movimientos_inventario (id_producto, tipo, cantidad, motivo, id_usuario, barberia_id)
                    VALUES (?, 'Salida', ?, ?, ?, ?)
                `).run(item.id_producto, item.cantidad, `Venta #${ventaId}`, req.user.id, req.barberia_id);
            }

            if (item.id_servicio && id_barbero) {
                const barbero = db.prepare('SELECT porcentaje_comision FROM barberos WHERE id = ? AND barberia_id = ?').get(id_barbero, req.barberia_id);
                if (barbero) {
                    const comision = subtotal * barbero.porcentaje_comision;
                    db.prepare(`
                        INSERT INTO comisiones_pendientes (id_barbero, id_venta_detalle, monto, barberia_id)
                        VALUES (?, ?, ?, ?)
                    `).run(id_barbero, detalleId, comision, req.barberia_id);
                }
            }
        }

        res.status(201).json({
            message: 'Venta registrada exitosamente',
            id: ventaId,
            total: totalVenta
        });
    } catch (error) {
        console.error('Error creando venta:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/ventas/:id/cancelar - Cancelar venta (revertir stock y comisiones)
router.post('/:id/cancelar', verifyToken, requireTenant, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const venta = db.prepare('SELECT id, estado FROM ventas_cabecera WHERE id = ? AND barberia_id = ?').get(id, req.barberia_id);
        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }
        if (venta.estado === 'cancelada') {
            return res.json({ message: 'Venta ya estaba cancelada' });
        }

        const detalles = db.prepare('SELECT * FROM ventas_detalle WHERE id_venta_cabecera = ? AND barberia_id = ?').all(id, req.barberia_id);

        for (const det of detalles) {
            if (det.id_producto) {
                db.prepare('UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ? AND barberia_id = ?')
                    .run(det.cantidad, det.id_producto, req.barberia_id);

                db.prepare(`
                    INSERT INTO movimientos_inventario (id_producto, tipo, cantidad, motivo, id_usuario, barberia_id)
                    VALUES (?, 'Entrada', ?, ?, ?, ?)
                `).run(det.id_producto, det.cantidad, `Cancelación venta #${id}`, req.user.id, req.barberia_id);
            }
        }

        const detalleIds = detalles.map(d => d.id);
        if (detalleIds.length > 0) {
            const placeholders = detalleIds.map(() => '?').join(',');
            db.prepare(`DELETE FROM comisiones_pendientes WHERE id_venta_detalle IN (${placeholders}) AND barberia_id = ?`)
                .run(...detalleIds, req.barberia_id);
        }

        db.prepare("UPDATE ventas_cabecera SET estado = 'cancelada' WHERE id = ? AND barberia_id = ?").run(id, req.barberia_id);

        console.log(`❌ Venta #${id} cancelada — stock y comisiones revertidos`);
        res.json({ message: 'Venta cancelada — stock y comisiones revertidos' });
    } catch (error) {
        console.error('Error cancelando venta:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/ventas/completar-cita — Crea venta + marca cita Completada en una sola transacción SQLite
router.post('/completar-cita', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id_cita, items_extra = [], metodo_pago = 'Efectivo' } = req.body;

        if (!id_cita) {
            return res.status(400).json({ error: 'id_cita es requerido' });
        }

        // Leer cita base con todos los datos necesarios
        const cita = db.prepare(`
            SELECT c.id, c.estado, c.id_cliente, c.id_servicio, c.id_barbero, c.barberia_id,
                   s.precio, s.nombre_servicio
            FROM citas c
            LEFT JOIN servicios s ON c.id_servicio = s.id
            WHERE c.id = ? AND c.barberia_id = ?
        `).get(id_cita, req.barberia_id);

        if (!cita) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        if (cita.estado === 'Completada') {
            return res.status(409).json({ error: 'Esta cita ya fue completada' });
        }
        if (cita.estado === 'Cancelada') {
            return res.status(409).json({ error: 'No se puede completar una cita cancelada' });
        }

        // Validar stock de productos extra antes de abrir la transacción
        for (const item of items_extra) {
            if (item.id_producto) {
                const producto = db.prepare('SELECT stock_actual FROM productos WHERE id = ? AND barberia_id = ?').get(item.id_producto, req.barberia_id);
                if (!producto) return res.status(400).json({ error: `Producto ${item.id_producto} no encontrado` });
                if (producto.stock_actual < item.cantidad) {
                    return res.status(400).json({ error: `Stock insuficiente. Disponible: ${producto.stock_actual}` });
                }
            }
        }

        // Transacción atómica: si cualquier paso falla, todo se revierte
        const ejecutarCierre = db.transaction(() => {
            const mxDateTime = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss");

            // Construir lista completa de items (servicio base + extras)
            const allItems = [];

            // Item base: servicio de la cita (si existe)
            if (cita.id_servicio && cita.precio) {
                allItems.push({
                    id_servicio: cita.id_servicio,
                    id_producto: null,
                    cantidad: 1,
                    precio_unitario: cita.precio
                });
            }

            // Items extra del modal
            for (const item of items_extra) {
                allItems.push({
                    id_servicio: item.id_servicio || null,
                    id_producto: item.id_producto || null,
                    cantidad: item.cantidad || 1,
                    precio_unitario: item.precio_unitario
                });
            }

            // Calcular total
            let totalVenta = 0;
            for (const item of allItems) {
                totalVenta += item.precio_unitario * item.cantidad;
            }

            // 1. Crear venta cabecera
            const ventaResult = db.prepare(`
                INSERT INTO ventas_cabecera (id_barbero, total_venta, metodo_pago, notas, estado, fecha, barberia_id)
                VALUES (?, ?, ?, ?, 'completada', ?, ?)
            `).run(
                cita.id_barbero || null,
                totalVenta,
                metodo_pago,
                `Cierre de cita #${id_cita}`,
                mxDateTime,
                req.barberia_id
            );
            const ventaId = ventaResult.lastInsertRowid;

            // 2. Crear ventas_detalle + comisiones + movimientos
            for (const item of allItems) {
                const subtotal = item.precio_unitario * item.cantidad;

                const detalleResult = db.prepare(`
                    INSERT INTO ventas_detalle (id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal, barberia_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(ventaId, item.id_servicio, item.id_producto, item.cantidad, item.precio_unitario, subtotal, req.barberia_id);

                const detalleId = detalleResult.lastInsertRowid;

                // Descontar stock si es producto
                if (item.id_producto) {
                    db.prepare('UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ? AND barberia_id = ?')
                        .run(item.cantidad, item.id_producto, req.barberia_id);

                    db.prepare(`
                        INSERT INTO movimientos_inventario (id_producto, tipo, cantidad, motivo, id_usuario, barberia_id)
                        VALUES (?, 'Salida', ?, ?, ?, ?)
                    `).run(item.id_producto, item.cantidad, `Cierre cita #${id_cita} → Venta #${ventaId}`, req.user.id, req.barberia_id);
                }

                // Registrar comisión si es servicio con barbero asignado
                if (item.id_servicio && cita.id_barbero) {
                    const barbero = db.prepare('SELECT porcentaje_comision FROM barberos WHERE id = ? AND barberia_id = ?').get(cita.id_barbero, req.barberia_id);
                    if (barbero) {
                        const comision = subtotal * barbero.porcentaje_comision;
                        db.prepare(`
                            INSERT INTO comisiones_pendientes (id_barbero, id_venta_detalle, monto, barberia_id)
                            VALUES (?, ?, ?, ?)
                        `).run(cita.id_barbero, detalleId, comision, req.barberia_id);
                    }
                }
            }

            // 3. Marcar cita como Completada (último paso — transacción garantiza atomicidad)
            db.prepare("UPDATE citas SET estado = 'Completada' WHERE id = ? AND barberia_id = ?")
                .run(id_cita, req.barberia_id);

            return { ventaId, totalVenta };
        });

        const resultado = ejecutarCierre();

        console.log(`✅ Cita #${id_cita} completada → Venta #${resultado.ventaId} (Total: $${resultado.totalVenta})`);
        res.status(201).json({
            message: 'Servicio cerrado exitosamente',
            id_venta: resultado.ventaId,
            total: resultado.totalVenta
        });
    } catch (error) {
        console.error('Error completando cita:', error);
        res.status(500).json({ error: 'Error en el servidor al cerrar el servicio' });
    }
});

export default router;
