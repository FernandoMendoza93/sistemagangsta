import express from 'express';
import { verifyToken, requireTenant } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/escaner/config
 * Retorna la configuración HID del escáner para la barbería del usuario
 */
router.get('/config', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const config = await dbQuery.get(
            `SELECT scanner_threshold_ms, scanner_suffix, min_chars, activo 
             FROM barberias_hardware_config 
             WHERE barberia_id = ?`,
            [req.barberia_id]
        );

        if (!config) {
            // Regresamos configuración segura por default en caso de que SQL falle
            return res.json({
                scanner_threshold_ms: 35,
                scanner_suffix: 'Enter',
                min_chars: 6,
                activo: 1
            });
        }

        res.json(config);
    } catch (error) {
        console.error('Error fetching scanner config:', error);
        res.status(500).json({ error: 'Error del servidor obteniendo config' });
    }
});

/**
 * POST /api/escaner/validar-membresia
 * Toma el código interceptado y halla al cliente.
 */
router.post('/validar-membresia', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Código vacío' });
        }

        // Buscar al cliente por código QR / Membresía
        const cliente = await dbQuery.get(
            `SELECT id, nombre, telefono, ptos_lealtad, qr_code 
             FROM clientes 
             WHERE (qr_code = ? OR id = ?) AND barberia_id = ?`,
            [code, code, req.barberia_id]
        );

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json({
            valido: true,
            cliente
        });

    } catch (error) {
        console.error('Error validating membership scan:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;
