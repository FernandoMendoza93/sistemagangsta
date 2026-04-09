import express from 'express';
import { verifyToken, requireTenant } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notificaciones — Últimas 10 de los últimos 7 días
router.get('/', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        const notificaciones = await dbQuery.all(`
            SELECT n.id, n.mensaje, n.tipo, n.leido, n.fecha_creacion,
                   n.id_cita, c.fecha as cita_fecha, c.hora as cita_hora,
                   cl.nombre as cliente_nombre
            FROM notificaciones n
            LEFT JOIN citas c ON n.id_cita = c.id
            LEFT JOIN clientes cl ON c.id_cliente = cl.id
            WHERE n.barberia_id = ?
              AND n.fecha_creacion >= NOW() - INTERVAL 7 DAY
            ORDER BY n.fecha_creacion DESC
            LIMIT 10
        `, [req.barberia_id]);

        const sinLeer = await dbQuery.get(`
            SELECT COUNT(*) as total
            FROM notificaciones
            WHERE barberia_id = ? AND leido = 0
              AND fecha_creacion >= NOW() - INTERVAL 7 DAY
        `, [req.barberia_id]);

        res.json({
            notificaciones,
            sin_leer: sinLeer?.total || 0
        });
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PATCH /api/notificaciones/:id — Marcar como leída
router.patch('/:id', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        await dbQuery.run(
            'UPDATE notificaciones SET leido = 1 WHERE id = ? AND barberia_id = ?',
            [id, req.barberia_id]
        );

        res.json({ message: 'Notificación marcada como leída' });
    } catch (error) {
        console.error('Error marcando notificación:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PATCH /api/notificaciones/marcar-todas — Marcar todas como leídas
router.patch('/marcar-todas/leidas', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        await dbQuery.run(
            'UPDATE notificaciones SET leido = 1 WHERE barberia_id = ? AND leido = 0',
            [req.barberia_id]
        );

        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('Error marcando notificaciones:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
