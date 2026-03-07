import express from 'express';
import { verifyToken, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require SuperAdmin
router.use(verifyToken, requireSuperAdmin);

// GET /api/superadmin/stats — Global KPIs
router.get('/stats', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        const totalBarberias = await dbQuery.get('SELECT COUNT(*) as count FROM barberias');
        const activeBarberias = await dbQuery.get('SELECT COUNT(*) as count FROM barberias WHERE activo = 1');
        const totalClientes = await dbQuery.get('SELECT COUNT(*) as count FROM clientes');
        const totalCitas = await dbQuery.get('SELECT COUNT(*) as count FROM citas');

        // Ingresos por suscripciones (suma de precio_plan de activas)
        const ingresosSubs = await dbQuery.get(
            'SELECT COALESCE(SUM(precio_plan), 0) as total FROM barberias WHERE activo = 1'
        );

        res.json({
            barberias_total: totalBarberias.count,
            barberias_activas: activeBarberias.count,
            clientes_total: totalClientes.count,
            citas_total: totalCitas.count,
            ingresos_suscripciones: ingresosSubs.total
        });
    } catch (error) {
        console.error('Error en stats:', error);
        res.status(500).json({ error: 'Error obteniendo estadisticas' });
    }
});

// GET /api/superadmin/barberias — List all barber shops with metrics
router.get('/barberias', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        const barberias = await dbQuery.all(`
            SELECT b.*,
                (SELECT COUNT(*) FROM clientes c WHERE c.barberia_id = b.id) as total_clientes,
                (SELECT COUNT(*) FROM citas ci WHERE ci.barberia_id = b.id) as total_citas,
                (SELECT COUNT(*) FROM usuarios u WHERE u.barberia_id = b.id) as total_usuarios,
                (SELECT COALESCE(SUM(vc.total_venta), 0) FROM ventas_cabecera vc WHERE vc.barberia_id = b.id) as total_ventas
            FROM barberias b
            ORDER BY b.created_at DESC
        `);

        res.json(barberias);
    } catch (error) {
        console.error('Error listando barberias:', error);
        res.status(500).json({ error: 'Error listando barberias' });
    }
});

// PATCH /api/superadmin/barberias/:id/toggle — Activate/deactivate
router.patch('/barberias/:id/toggle', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        const barberia = await dbQuery.get('SELECT id, activo, nombre FROM barberias WHERE id = ?', [id]);
        if (!barberia) {
            return res.status(404).json({ error: 'Barberia no encontrada' });
        }

        const newStatus = barberia.activo ? 0 : 1;
        await dbQuery.run('UPDATE barberias SET activo = ? WHERE id = ?', [newStatus, id]);

        res.json({
            message: `${barberia.nombre} ${newStatus ? 'activada' : 'desactivada'}`,
            activo: newStatus
        });
    } catch (error) {
        console.error('Error toggle barberia:', error);
        res.status(500).json({ error: 'Error actualizando barberia' });
    }
});

// GET /api/superadmin/barberias/:id — Detail of a specific barberia
router.get('/barberias/:id', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        const barberia = await dbQuery.get(`
            SELECT b.*,
                (SELECT COUNT(*) FROM clientes c WHERE c.barberia_id = b.id) as total_clientes,
                (SELECT COUNT(*) FROM citas ci WHERE ci.barberia_id = b.id) as total_citas,
                (SELECT COUNT(*) FROM usuarios u WHERE u.barberia_id = b.id) as total_usuarios
            FROM barberias b WHERE b.id = ?
        `, [id]);

        if (!barberia) {
            return res.status(404).json({ error: 'Barberia no encontrada' });
        }

        res.json(barberia);
    } catch (error) {
        console.error('Error obteniendo barberia:', error);
        res.status(500).json({ error: 'Error obteniendo barberia' });
    }
});

export default router;
