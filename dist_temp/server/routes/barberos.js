import express from 'express';
import { verifyToken, requireRole, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/barberos - Listar todos los barberos
router.get('/', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        const barberos = db.prepare(`
      SELECT b.id, b.porcentaje_comision, b.estado, b.turno,
             u.id as id_usuario, u.nombre, u.email
      FROM barberos b
      JOIN usuarios u ON b.id_usuario = u.id
      WHERE u.activo = 1
      ORDER BY u.nombre
    `).all();

        res.json(barberos);
    } catch (error) {
        console.error('Error listando barberos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/barberos/activos - Solo barberos activos (para POS)
router.get('/activos', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        const barberos = db.prepare(`
      SELECT b.id, b.porcentaje_comision, b.turno,
             u.nombre
      FROM barberos b
      JOIN usuarios u ON b.id_usuario = u.id
      WHERE b.estado = 'Activo' AND u.activo = 1
      ORDER BY u.nombre
    `).all();

        res.json(barberos);
    } catch (error) {
        console.error('Error listando barberos activos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/barberos/:id - Obtener barbero por ID
router.get('/:id', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const barbero = db.prepare(`
      SELECT b.id, b.porcentaje_comision, b.estado, b.turno,
             u.id as id_usuario, u.nombre, u.email
      FROM barberos b
      JOIN usuarios u ON b.id_usuario = u.id
      WHERE b.id = ?
    `).get(id);

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
router.put('/:id', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { porcentaje_comision, estado, turno } = req.body;

        db.prepare(`
      UPDATE barberos 
      SET porcentaje_comision = COALESCE(?, porcentaje_comision),
          estado = COALESCE(?, estado),
          turno = COALESCE(?, turno)
      WHERE id = ?
    `).run(porcentaje_comision, estado, turno, id);

        res.json({ message: 'Barbero actualizado' });
    } catch (error) {
        console.error('Error actualizando barbero:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/barberos/:id/comisiones - Obtener comisiones de un barbero
router.get('/:id/comisiones', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { desde, hasta } = req.query;

        // Verificar que el barbero puede ver solo sus propias comisiones
        if (req.user.rol === ROLES.BARBERO) {
            const barbero = db.prepare('SELECT id FROM barberos WHERE id_usuario = ?').get(req.user.id);
            if (!barbero || barbero.id !== parseInt(id)) {
                return res.status(403).json({ error: 'No puedes ver comisiones de otros barberos' });
            }
        }

        let query = `
      SELECT cp.id, cp.monto, cp.fecha, cp.pagado
      FROM comisiones_pendientes cp
      WHERE cp.id_barbero = ?
    `;
        const params = [id];

        if (desde) {
            query += ' AND cp.fecha >= ?';
            params.push(desde);
        }
        if (hasta) {
            query += ' AND cp.fecha <= ?';
            params.push(hasta);
        }

        query += ' ORDER BY cp.fecha DESC';

        const comisiones = db.prepare(query).all(...params);

        // Calcular totales
        const totales = db.prepare(`
      SELECT 
        SUM(CASE WHEN pagado = 0 THEN monto ELSE 0 END) as pendiente,
        SUM(CASE WHEN pagado = 1 THEN monto ELSE 0 END) as pagado
      FROM comisiones_pendientes
      WHERE id_barbero = ?
    `).get(id);

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
router.post('/:id/pagar-comisiones', verifyToken, requireRole(ROLES.ADMIN), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { notas } = req.body;

        // Calcular total pendiente
        const pendiente = db.prepare(`
      SELECT SUM(monto) as total
      FROM comisiones_pendientes
      WHERE id_barbero = ? AND pagado = 0
    `).get(id);

        if (!pendiente.total || pendiente.total === 0) {
            return res.status(400).json({ error: 'No hay comisiones pendientes' });
        }

        // Registrar pago
        db.prepare(`
      INSERT INTO comisiones_pagadas (id_barbero, monto, id_usuario_admin, notas)
      VALUES (?, ?, ?, ?)
    `).run(id, pendiente.total, req.user.id, notas || '');

        // Marcar comisiones como pagadas
        db.prepare(`
      UPDATE comisiones_pendientes
      SET pagado = 1
      WHERE id_barbero = ? AND pagado = 0
    `).run(id);

        res.json({
            message: 'Comisiones pagadas',
            monto: pendiente.total
        });
    } catch (error) {
        console.error('Error pagando comisiones:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
