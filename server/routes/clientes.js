import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
        const mxNow = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");

        let query = `
            SELECT c.id, c.nombre, c.telefono, c.ultima_visita, c.fecha_registro, c.notas, c.activo,
                   c.id_rol_lealtad, l.nombre_nivel as nivel_lealtad, l.porcentaje_descuento, l.dias_max_frecuencia, l.premio_descripcion, l.color_hex,
                   (SELECT COUNT(*) FROM visitas_lealtad v WHERE v.id_cliente = c.id AND v.barberia_id = c.barberia_id AND DATE(v.fecha) >= DATE_SUB(?, INTERVAL 120 DAY)) as puntos_lealtad
            FROM clientes c
            LEFT JOIN barberia_lealtad_niveles l ON c.id_rol_lealtad = l.id_rol_lealtad
            WHERE c.activo = 1 AND c.barberia_id = ?
        `;
        const params = [mxNow, req.barberia_id];

        if (q) {
            query += ` AND (c.nombre LIKE ? OR c.telefono LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        query += ` ORDER BY c.nombre`;

        const rows = await dbQuery.all(query, params);
        
        const clientes = rows.map(c => ({
            id: c.id,
            nombre: c.nombre,
            telefono: c.telefono,
            puntos_lealtad: c.puntos_lealtad,
            ultima_visita: c.ultima_visita,
            fecha_registro: c.fecha_registro,
            notas: c.notas,
            activo: c.activo,
            descuento_activo: c.porcentaje_descuento || 0,
            nivel: {
                id: c.id_rol_lealtad,
                nombre: c.nivel_lealtad || 'Nivel General',
                descuento: c.porcentaje_descuento || 0,
                frecuencia: c.dias_max_frecuencia || 999,
                premio: c.premio_descripcion || 'Recompensa por sellos',
                color_hex: c.color_hex || '#e2725b'
            }
        }));

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
        const mxDate = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");

        const rows = await dbQuery.all(`
            SELECT c.id, c.nombre, c.telefono, c.ultima_visita, c.fecha_registro, c.notas,
                   DATEDIFF(?, c.ultima_visita) as dias_sin_visita,
                   c.id_rol_lealtad, l.nombre_nivel as nivel_lealtad, l.porcentaje_descuento, l.dias_max_frecuencia, l.premio_descripcion, l.color_hex,
                   (SELECT COUNT(*) FROM visitas_lealtad v WHERE v.id_cliente = c.id AND v.barberia_id = c.barberia_id AND DATE(v.fecha) >= DATE_SUB(?, INTERVAL 120 DAY)) as puntos_lealtad
            FROM clientes c
            LEFT JOIN barberia_lealtad_niveles l ON c.id_rol_lealtad = l.id_rol_lealtad
            WHERE c.activo = 1
              AND c.ultima_visita IS NOT NULL
              AND DATEDIFF(?, c.ultima_visita) > 30
              AND c.barberia_id = ?
            ORDER BY c.ultima_visita ASC
        `, [mxDateTime, mxDate, mxDateTime, req.barberia_id]);

        const clientes = rows.map(c => ({
            id: c.id,
            nombre: c.nombre,
            telefono: c.telefono,
            puntos_lealtad: c.puntos_lealtad,
            ultima_visita: c.ultima_visita,
            fecha_registro: c.fecha_registro,
            notas: c.notas,
            dias_sin_visita: c.dias_sin_visita,
            descuento_activo: c.porcentaje_descuento || 0,
            nivel: {
                id: c.id_rol_lealtad,
                nombre: c.nivel_lealtad || 'Bronce (Base)',
                descuento: c.porcentaje_descuento || 0,
                frecuencia: c.dias_max_frecuencia || 999,
                premio: c.premio_descripcion || 'Recompensa por sellos'
            }
        }));

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
        const mxDate = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");

        const row = await dbQuery.get(`
            SELECT c.id, c.nombre, c.telefono, c.ultima_visita, c.fecha_registro, c.notas, c.activo,
                   c.id_rol_lealtad, l.nombre_nivel as nivel_lealtad, l.porcentaje_descuento, l.dias_max_frecuencia, l.premio_descripcion, l.color_hex,
                   (SELECT COUNT(*) FROM visitas_lealtad v WHERE v.id_cliente = c.id AND v.barberia_id = c.barberia_id AND DATE(v.fecha) >= DATE_SUB(?, INTERVAL 120 DAY)) as puntos_lealtad
            FROM clientes c
            LEFT JOIN barberia_lealtad_niveles l ON c.id_rol_lealtad = l.id_rol_lealtad
            WHERE c.id = ? AND c.barberia_id = ?
        `, [mxDate, id, req.barberia_id]);

        if (!row) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = {
            id: row.id,
            nombre: row.nombre,
            telefono: row.telefono,
            puntos_lealtad: row.puntos_lealtad,
            ultima_visita: row.ultima_visita,
            fecha_registro: row.fecha_registro,
            notas: row.notas,
            activo: row.activo,
            descuento_activo: row.porcentaje_descuento || 0,
            nivel: {
                id: row.id_rol_lealtad,
                nombre: row.nivel_lealtad || 'Nivel General',
                descuento: row.porcentaje_descuento || 0,
                frecuencia: row.dias_max_frecuencia || 999,
                premio: row.premio_descripcion || 'Recompensa por sellos',
                color_hex: row.color_hex || '#e2725b'
            }
        };

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

        let telefonoLimpio = null;
        if (telefono) {
            telefonoLimpio = telefono.replace(/\D/g, ''); // Deja solo los números
            if (telefonoLimpio.length > 0) {
                // Verificar si ya existe un cliente activo con el mismo teléfono
                const existingClient = await dbQuery.get(
                    'SELECT id, nombre FROM clientes WHERE telefono = ? AND barberia_id = ? AND activo = 1',
                    [telefonoLimpio, req.barberia_id]
                );
                
                if (existingClient) {
                    return res.status(400).json({ 
                        error: `Ya existe un cliente registrado con este número de teléfono: ${existingClient.nombre}` 
                    });
                }
            } else {
                telefonoLimpio = null;
            }
        }

        const plainPin = `FLW-${Math.floor(1000 + Math.random() * 9000)}`;
        const pinHash = await bcrypt.hash(plainPin, 10);

        const result = await dbQuery.run(`
            INSERT INTO clientes (nombre, telefono, notas, barberia_id, password_hash)
            VALUES (?, ?, ?, ?, ?)
        `, [nombre, telefonoLimpio, notas || null, req.barberia_id, pinHash]);

        res.status(201).json({
            message: 'Cliente registrado',
            id: result.lastInsertRowid,
            pin: plainPin
        });
    } catch (error) {
        console.error('Error creando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/clientes/:id/reset-pin - Resetear PIN temporal
router.post('/:id/reset-pin', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        const plainPin = `FLW-${Math.floor(1000 + Math.random() * 9000)}`;
        const pinHash = await bcrypt.hash(plainPin, 10);

        await dbQuery.run(`
            UPDATE clientes
            SET password_hash = ?
            WHERE id = ? AND barberia_id = ?
        `, [pinHash, id, req.barberia_id]);

        res.json({
            message: 'PIN reseteado exitosamente',
            pin: plainPin
        });
    } catch (error) {
        console.error('Error reseteando PIN:', error);
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
