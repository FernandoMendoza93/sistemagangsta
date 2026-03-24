import express from 'express';
import crypto from 'crypto';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Mexico_City");

const router = express.Router();

// GET /api/clientes - Listar clientes del tenant (con búsqueda opcional ?q=)
router.get('/', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { q } = req.query;

        let query = `
            SELECT id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro, notas, activo
            FROM clientes
            WHERE activo = 1 AND barberia_id = ?
        `;
        const params = [req.barberia_id];

        if (q) {
            query += ` AND (nombre LIKE ? OR telefono LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        query += ` ORDER BY nombre`;

        const clientes = await dbQuery.all(query, params);
        res.json(clientes);
    } catch (error) {
        console.error('Error listando clientes:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/clientes/inactivos - Clientes sin visita en +30 días
router.get('/inactivos', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const mxDateTime = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss");

        const clientes = await dbQuery.all(`
            SELECT id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro, notas,
                   DATEDIFF(?, ultima_visita) as dias_sin_visita
            FROM clientes
            WHERE activo = 1
              AND ultima_visita IS NOT NULL
              AND DATEDIFF(?, ultima_visita) > 30
              AND barberia_id = ?
            ORDER BY ultima_visita ASC
        `, [mxDateTime, mxDateTime, req.barberia_id]);

        res.json(clientes);
    } catch (error) {
        console.error('Error listando clientes inactivos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/clientes/:id - Detalle de un cliente (verificado por tenant)
router.get('/:id', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        const cliente = await dbQuery.get(`
            SELECT id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro, notas, activo
            FROM clientes
            WHERE id = ? AND barberia_id = ?
        `, [id, req.barberia_id]);

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(cliente);
    } catch (error) {
        console.error('Error obteniendo cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/clientes - Crear cliente (con barberia_id)
router.post('/', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { nombre, telefono, notas } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const result = await dbQuery.run(`
            INSERT INTO clientes (nombre, telefono, notas, barberia_id)
            VALUES (?, ?, ?, ?)
        `, [nombre, telefono || null, notas || null, req.barberia_id]);

        res.status(201).json({
            message: 'Cliente registrado',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error creando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { nombre, telefono, notas, puntos_lealtad, activo } = req.body;

        await dbQuery.run(`
            UPDATE clientes
            SET nombre = COALESCE(?, nombre),
                telefono = COALESCE(?, telefono),
                notas = COALESCE(?, notas),
                puntos_lealtad = COALESCE(?, puntos_lealtad),
                activo = COALESCE(?, activo)
            WHERE id = ? AND barberia_id = ?
        `, [nombre, telefono, notas, puntos_lealtad, activo, id, req.barberia_id]);

        res.json({ message: 'Cliente actualizado' });
    } catch (error) {
        console.error('Error actualizando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// DELETE /api/clientes/:id - Desactivar cliente (soft delete)
router.delete('/:id', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        await dbQuery.run('UPDATE clientes SET activo = 0 WHERE id = ? AND barberia_id = ?', [id, req.barberia_id]);

        res.json({ message: 'Cliente desactivado' });
    } catch (error) {
        console.error('Error desactivando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// V2.0 LOYALTY ENDPOINTS

// GET /api/clientes/wallet-status - Progreso de lealtad del cliente logueado
router.get('/wallet/status', verifyToken, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden ver su wallet' });
        }

        const cliente = await dbQuery.get('SELECT id, nombre, telefono FROM clientes WHERE id = ? AND barberia_id = ?', [req.user.id, req.barberia_id]);
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

        const now = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss");
        const sellosQuery = await dbQuery.get(`
            SELECT COUNT(*) as totales
            FROM visitas_lealtad
            WHERE id_cliente = ?
              AND DATE(fecha) >= DATE_SUB(?, INTERVAL 120 DAY)
              AND barberia_id = ?
        `, [cliente.id, now, req.barberia_id]);

        const totales = sellosQuery.totales;
        const sellos_actuales = totales % 10;
        const recompensa_disponible = totales > 0 && sellos_actuales === 0;

        let nivel = 'Bronce';
        if (totales >= 4 && totales < 8) nivel = 'Plata';
        if (totales >= 8) nivel = 'Oro';

        const encryptedId = Buffer.from(`FLOW-${req.barberia_id}-${cliente.id}`).toString('base64');

        res.json({
            id: cliente.id,
            nombre: cliente.nombre,
            nivel,
            sellos_actuales,
            total_requerido: 10,
            recompensa_disponible,
            qr_token: encryptedId
        });
    } catch (error) {
        console.error('Error obteniendo wallet:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/clientes/scan/:token - El staff escanea un token
router.get('/scan/:token', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { token } = req.params;

        let decrypted = '';
        try {
            decrypted = Buffer.from(token, 'base64').toString('ascii');
        } catch (e) {
            return res.status(400).json({ error: 'Token QR inválido' });
        }

        // Support both old GANGSTA- and new FLOW-{barberia_id}- format
        let clientId;
        if (decrypted.startsWith('FLOW-')) {
            const parts = decrypted.split('-');
            const tokenBarberiaId = parseInt(parts[1]);
            if (tokenBarberiaId !== req.barberia_id) {
                return res.status(403).json({ error: 'Este cliente no pertenece a tu barbería' });
            }
            clientId = parseInt(parts[2]);
        } else if (decrypted.startsWith('GANGSTA-')) {
            clientId = parseInt(decrypted.split('-')[1]);
        } else {
            return res.status(400).json({ error: 'Formato QR no reconocido' });
        }

        const cliente = await dbQuery.get('SELECT id, nombre, telefono, ultima_visita FROM clientes WHERE id = ? AND barberia_id = ?', [clientId, req.barberia_id]);
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado en la base de datos' });

        const now = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss");
        const sellosQuery = await dbQuery.get(`
            SELECT COUNT(*) as totales
            FROM visitas_lealtad
            WHERE id_cliente = ?
              AND DATE(fecha) >= DATE_SUB(?, INTERVAL 120 DAY)
              AND barberia_id = ?
        `, [cliente.id, now, req.barberia_id]);

        const totales = sellosQuery.totales;
        const sellos_actuales = totales % 10;
        const recompensa_disponible = totales > 0 && sellos_actuales === 0;

        const hoy = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
        const citaHoy = await dbQuery.get(`
            SELECT c.id, c.hora, s.nombre_servicio
            FROM citas c
            JOIN servicios s ON c.id_servicio = s.id
            WHERE c.id_cliente = ? AND c.fecha = ? AND c.estado IN ('Pendiente', 'Confirmada') AND c.barberia_id = ?
            ORDER BY c.hora ASC LIMIT 1
        `, [cliente.id, hoy, req.barberia_id]);

        // Check if stamp was already given today
        const selloHoy = await dbQuery.get(`
            SELECT id FROM visitas_lealtad
            WHERE id_cliente = ? AND barberia_id = ? AND DATE(fecha) = ?
        `, [cliente.id, req.barberia_id, hoy]);

        res.json({
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                ultima_visita: cliente.ultima_visita
            },
            lealtad: {
                cortes_120_dias: totales,
                sellos_actuales,
                recompensa_disponible
            },
            cita_hoy: citaHoy || null,
            sello_hoy: !!selloHoy
        });

    } catch (error) {
        console.error('Error escaneando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor al escanear' });
    }
});

export default router;
