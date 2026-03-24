import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyToken, requireTenant, requireRole, ROLES } from '../middleware/auth.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Mexico_City");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_2024';

// SSE Clients Registry (key: cliente_id, value: response object)
const sseClients = new Map();

// Helper to notify a specific client via SSE
function notifyClient(clienteId, eventData) {
    const clientRes = sseClients.get(clienteId);
    if (clientRes) {
        clientRes.write(`data: ${JSON.stringify(eventData)}\n\n`);
    }
}

// GET /api/loyalty/stream — SSE endpoint for real-time updates on client portal
router.get('/stream', verifyToken, (req, res) => {
    // Only logged-in clients should connect to this stream
    if (req.user.rol !== 'Cliente') {
        return res.status(403).json({ error: 'Solo clientes permitidos' });
    }

    const clienteId = req.user.id;

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Add to registry
    sseClients.set(clienteId, res);
    console.log(`📡 SSE: Cliente ${clienteId} conectado al stream de lealtad.`);

    // Keep connection alive with periodic pings
    const pingInterval = setInterval(() => {
        res.write(': ping\n\n');
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
        console.log(`📡 SSE: Cliente ${clienteId} desconectado.`);
        clearInterval(pingInterval);
        sseClients.delete(clienteId);
    });
});

// POST /api/loyalty/scan — Instant scan and stamp (Staff only)
router.post('/scan', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { token } = req.body;

        if (!token) return res.status(400).json({ error: 'Token requerido' });

        // Decode the QR token (Format expected: FLOW-{barberia_id}-{cliente_id} base64 encoded)
        let decodedDecrypted;
        try {
            decodedDecrypted = Buffer.from(token, 'base64').toString('ascii');
        } catch (e) {
            return res.status(400).json({ error: 'Formato QR no reconocido' });
        }

        const parts = decodedDecrypted.split('-');
        if (parts.length !== 3 || parts[0] !== 'FLOW') {
            return res.status(400).json({ error: 'Formato QR no reconocido' });
        }

        const tokenBarberiaId = parseInt(parts[1]);
        const clienteId = parseInt(parts[2]);

        // Security: Ensure token belongs to this barbershop
        if (tokenBarberiaId !== req.barberia_id) {
            return res.status(403).json({ error: 'Código no válido para este establecimiento' });
        }

        const mxDate = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
        const mxDateTime = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss");

        // Verify client exists and belongs to this barbershop
        const cliente = await dbQuery.get('SELECT id, nombre, telefono, puntos_lealtad FROM clientes WHERE id = ? AND barberia_id = ? AND activo = 1', [clienteId, req.barberia_id]);

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Anti-spam info: Check if client was already scanned today in visitas_lealtad
        const yaSelladoHoy = await dbQuery.get(`
            SELECT id FROM visitas_lealtad
            WHERE id_cliente = ? AND barberia_id = ? AND DATE(fecha) = ?
        `, [clienteId, req.barberia_id, mxDate]);

        let actionMessage = '';
        let pointsAdded = false;

        if (yaSelladoHoy) {
            actionMessage = 'Sello ya agregado hoy';
        } else {
            // 1. Audit Log in visitas_lealtad (This is the ONLY source of truth now)
            await dbQuery.run(`
                INSERT INTO visitas_lealtad (id_cliente, barberia_id, id_barbero, fecha)
                VALUES (?, ?, ?, ?)
            `, [clienteId, req.barberia_id, req.user.id, mxDateTime]);

            // 2. Update client last visit (but NOT puntos_lealtad, as it's dynamic now)
            await dbQuery.run(`
                UPDATE clientes SET ultima_visita = ? WHERE id = ? AND barberia_id = ?
            `, [mxDateTime, clienteId, req.barberia_id]);

            actionMessage = '¡Sello agregado hoy ✓!';
            pointsAdded = true;

            // Notify client portal in real-time
            notifyClient(clienteId, { type: 'STAMP_ADDED', message: '¡Has recibido un nuevo sello!', timestamp: mxDateTime });
        }

        // Get final points status dynamically (last 120 days)
        const mxNow = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss");
        const sellosQuery = await dbQuery.get(`
            SELECT COUNT(*) as totales
            FROM visitas_lealtad
            WHERE id_cliente = ? AND barberia_id = ?
              AND DATE(fecha) >= DATE_SUB(?, INTERVAL 120 DAY)
        `, [clienteId, req.barberia_id, mxNow]);

        const sellos_actuales = sellosQuery.totales % 10;
        const recompensa_disponible = sellosQuery.totales > 0 && sellos_actuales === 0;

        res.json({
            success: true,
            action: pointsAdded ? 'ADDED' : 'ALREADY_ADDED',
            message: actionMessage,
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                telefono: cliente.telefono
            },
            lealtad: {
                sellos_actuales,
                totales_historico: sellosQuery.totales,
                recompensa_disponible
            }
        });

    } catch (error) {
        console.error('Error en escaneo de lealtad:', error);
        res.status(500).json({ error: 'Error en el servidor al procesar QR' });
    }
});

export default router;
