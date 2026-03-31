import express from 'express';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/barberos - Listar todos los barberos del tenant
router.get('/', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        const barberos = await dbQuery.all(`
            SELECT b.id, b.porcentaje_comision, b.estado, b.turno,
                   u.id as id_usuario, u.nombre, u.email
            FROM barberos b
            JOIN usuarios u ON b.id_usuario = u.id
            WHERE u.activo = 1 AND b.barberia_id = ?
            ORDER BY u.nombre
        `, [req.barberia_id]);

        res.json(barberos);
    } catch (error) {
        console.error('Error listando barberos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/barberos/activos - Solo barberos activos (para POS)
router.get('/activos', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        const barberos = await dbQuery.all(`
            SELECT b.id, b.porcentaje_comision, b.turno,
                   u.nombre
            FROM barberos b
            JOIN usuarios u ON b.id_usuario = u.id
            WHERE b.estado = 'Activo' AND u.activo = 1 AND b.barberia_id = ?
            ORDER BY u.nombre
        `, [req.barberia_id]);

        res.json(barberos);
    } catch (error) {
        console.error('Error listando barberos activos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/barberos/:id - Obtener barbero por ID (verificado por tenant)
router.get('/:id', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        const barbero = await dbQuery.get(`
            SELECT b.id, b.porcentaje_comision, b.estado, b.turno,
                   u.id as id_usuario, u.nombre, u.email
            FROM barberos b
            JOIN usuarios u ON b.id_usuario = u.id
            WHERE b.id = ? AND b.barberia_id = ?
        `, [id, req.barberia_id]);

        if (!barbero) {
            return res.status(404).json({ error: 'Barbero no encontrado' });
        }

        res.json(barbero);
    } catch (error) {
        console.error('Error obteniendo barbero:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/barberos/:id - Actualizar barbero (Admin/Encargado)
router.put('/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { porcentaje_comision, estado, turno } = req.body;

        await dbQuery.run(`
            UPDATE barberos
            SET porcentaje_comision = COALESCE(?, porcentaje_comision),
                estado = COALESCE(?, estado),
                turno = COALESCE(?, turno)
            WHERE id = ? AND barberia_id = ?
        `, [porcentaje_comision, estado, turno, id, req.barberia_id]);

        res.json({ message: 'Barbero actualizado' });
    } catch (error) {
        console.error('Error actualizando barbero:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/barberos/:id/comisiones - Obtener comisiones de un barbero
router.get('/:id/comisiones', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { desde, hasta } = req.query;

        // Verificar que el barbero pertenece al tenant
        const barberoCheck = await dbQuery.get('SELECT id FROM barberos WHERE id = ? AND barberia_id = ?', [id, req.barberia_id]);
        if (!barberoCheck) {
            return res.status(404).json({ error: 'Barbero no encontrado' });
        }

        // Verificar que el barbero puede ver solo sus propias comisiones
        if (req.user.rol === ROLES.BARBERO) {
            const barbero = await dbQuery.get('SELECT id FROM barberos WHERE id_usuario = ?', [req.user.id]);
            if (!barbero || barbero.id !== parseInt(id)) {
                return res.status(403).json({ error: 'No puedes ver comisiones de otros barberos' });
            }
        }

        let query = `
            SELECT cp.id, cp.monto, cp.tipo, cp.fecha, cp.pagado
            FROM comisiones_pendientes cp
            WHERE cp.id_barbero = ? AND cp.barberia_id = ?
        `;
        const params = [id, req.barberia_id];

        if (desde) {
            query += ' AND cp.fecha >= ?';
            params.push(desde);
        }
        if (hasta) {
            query += ' AND cp.fecha <= ?';
            params.push(hasta);
        }

        query += ' ORDER BY cp.fecha DESC';

        const comisiones = await dbQuery.all(query, params);

        const totales = await dbQuery.get(`
            SELECT
                SUM(CASE WHEN pagado = 0 THEN monto ELSE 0 END) as pendiente,
                SUM(CASE WHEN pagado = 1 THEN monto ELSE 0 END) as pagado
            FROM comisiones_pendientes
            WHERE id_barbero = ? AND barberia_id = ?
        `, [id, req.barberia_id]);

        res.json({
            comisiones,
            totales: {
                pendiente: totales.pendiente || 0,
                pagado: totales.pagado || 0
            }
        });
    } catch (error) {
        console.error('Error obteniendo comisiones:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/barberos/:id/pagar-comisiones - Pagar comisiones pendientes
router.post('/:id/pagar-comisiones', verifyToken, requireTenant, requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { notas } = req.body;

        const pendiente = await dbQuery.get(`
            SELECT SUM(monto) as total
            FROM comisiones_pendientes
            WHERE id_barbero = ? AND pagado = 0 AND barberia_id = ?
        `, [id, req.barberia_id]);

        if (!pendiente.total || pendiente.total === 0) {
            return res.status(400).json({ error: 'No hay comisiones pendientes' });
        }

        await dbQuery.run(`
            INSERT INTO comisiones_pagadas (id_barbero, monto, id_usuario_admin, notas, barberia_id)
            VALUES (?, ?, ?, ?, ?)
        `, [id, pendiente.total, req.user.id, notas || '', req.barberia_id]);

        await dbQuery.run(`
            UPDATE comisiones_pendientes
            SET pagado = 1
            WHERE id_barbero = ? AND pagado = 0 AND barberia_id = ?
        `, [id, req.barberia_id]);

        res.json({
            message: 'Comisiones pagadas',
            monto: pendiente.total
        });
    } catch (error) {
        console.error('Error pagando comisiones:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/barberos/:id/historial-pagos - Historial de pagos de comisiones
router.get('/:id/historial-pagos', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        if (req.user.rol === ROLES.BARBERO) {
            const barbero = await dbQuery.get('SELECT id FROM barberos WHERE id_usuario = ?', [req.user.id]);
            if (!barbero || barbero.id !== parseInt(id)) {
                return res.status(403).json({ error: 'No puedes ver el historial de otros barberos' });
            }
        }

        const pagos = await dbQuery.all(`
            SELECT cp.id, cp.monto, cp.fecha_pago, cp.notas,
                   u.nombre as pagado_por
            FROM comisiones_pagadas cp
            LEFT JOIN usuarios u ON cp.id_usuario_admin = u.id
            WHERE cp.id_barbero = ? AND cp.barberia_id = ?
            ORDER BY cp.fecha_pago DESC
        `, [id, req.barberia_id]);

        res.json(pagos);
    } catch (error) {
        console.error('Error obteniendo historial de pagos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
