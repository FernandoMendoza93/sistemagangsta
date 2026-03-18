import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/super/temas — List all available master palettes
router.get('/temas', verifyToken, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const temas = await dbQuery.all('SELECT * FROM temas ORDER BY id ASC');
        res.json(temas);
    } catch (error) {
        console.error('Error obteniendo temas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/super/barberias/:id/config — Get visual config for a specific barberia (Isolating Engram 002)
router.get('/barberias/:id/config', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const dbQuery = req.app.locals.dbQuery;

        // Security: Ensure user is SuperAdmin OR Admin of this specific barberia
        if (req.user.rol !== 'SuperAdmin' && req.user.barberia_id !== parseInt(id)) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta configuración' });
        }

        const barberia = await dbQuery.get(
            `SELECT b.id, b.nombre, b.logo_url, b.color_acento, b.slug,
                    t.bg_main, t.bg_surface, t.accent_primary, t.accent_secondary, t.text_main, t.text_muted, t.clase_glass
             FROM barberias b
             LEFT JOIN temas t ON b.tema_id = t.id
             WHERE b.id = ?`,
            [id]
        );

        if (!barberia) {
            return res.status(404).json({ error: 'Barbería no encontrada' });
        }

        res.json(barberia);
    } catch (error) {
        console.error('Error obteniendo config de barbería:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PATCH /api/super/barberias/:id/tema — Update a barberia's theme
// Restricted to the barberia's own admin or SuperAdmin
router.patch('/barberias/:id/tema', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tema_id } = req.body;
        const dbQuery = req.app.locals.dbQuery;

        // Security: Ensure user is SuperAdmin OR Admin of this specific barberia
        if (req.user.rol !== 'SuperAdmin' && req.user.barberia_id !== parseInt(id)) {
            return res.status(403).json({ error: 'No tienes permiso para modificar esta barbería' });
        }

        if (!tema_id) {
            return res.status(400).json({ error: 'tema_id es requerido' });
        }

        // Verify theme exists
        const theme = await dbQuery.get('SELECT id FROM temas WHERE id = ?', [tema_id]);
        if (!theme) {
            return res.status(404).json({ error: 'Tema no encontrado' });
        }

        const result = await dbQuery.run(
            'UPDATE barberias SET tema_id = ? WHERE id = ?',
            [tema_id, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Barbería no encontrada' });
        }

        res.json({ message: 'Tema actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando tema de barbería:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
