import express from 'express';
import { verifyToken, requireRole, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/citas/mis-citas - Citas del cliente logueado
router.get('/mis-citas', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden ver sus citas' });
        }

        const citas = db.prepare(`
            SELECT c.id, c.fecha, c.hora, c.estado, c.notas, c.fecha_creacion,
                   s.nombre_servicio, s.precio, s.duracion_aprox,
                   u.nombre as barbero_nombre
            FROM citas c
            LEFT JOIN servicios s ON c.id_servicio = s.id
            LEFT JOIN barberos b ON c.id_barbero = b.id
            LEFT JOIN usuarios u ON b.id_usuario = u.id
            WHERE c.id_cliente = ?
            ORDER BY c.fecha DESC, c.hora DESC
        `).all(req.user.id);

        res.json(citas);
    } catch (error) {
        console.error('Error obteniendo citas del cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/citas - Crear cita (solo clientes)
router.post('/', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden agendar citas' });
        }

        const { id_servicio, id_barbero, fecha, hora, notas } = req.body;

        if (!fecha || !hora) {
            return res.status(400).json({ error: 'Fecha y hora son requeridas' });
        }

        const result = db.prepare(`
            INSERT INTO citas (id_cliente, id_servicio, id_barbero, fecha, hora, notas)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(req.user.id, id_servicio || null, id_barbero || null, fecha, hora, notas || null);

        res.status(201).json({
            message: 'Cita agendada',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error creando cita:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/citas - Todas las citas (Admin/Encargado/Barbero)
router.get('/', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { fecha, estado } = req.query;

        let query = `
            SELECT c.id, c.fecha, c.hora, c.estado, c.notas, c.fecha_creacion,
                   cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
                   s.nombre_servicio, s.precio,
                   u.nombre as barbero_nombre
            FROM citas c
            JOIN clientes cl ON c.id_cliente = cl.id
            LEFT JOIN servicios s ON c.id_servicio = s.id
            LEFT JOIN barberos b ON c.id_barbero = b.id
            LEFT JOIN usuarios u ON b.id_usuario = u.id
        `;

        const conditions = [];
        const params = [];

        // Filtro restrictivo para Barberos
        if (req.user.rol === 'Barbero') {
            const barbero = db.prepare('SELECT id FROM barberos WHERE id_usuario = ?').get(req.user.id);
            if (!barbero) {
                return res.json([]); // No es un barbero registrado
            }
            conditions.push('c.id_barbero = ?');
            params.push(barbero.id);
        }

        if (fecha) {
            conditions.push('c.fecha = ?');
            params.push(fecha);
        }

        if (estado) {
            conditions.push('c.estado = ?');
            params.push(estado);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY c.fecha ASC, c.hora ASC';

        const citas = db.prepare(query).all(...params);
        res.json(citas);
    } catch (error) {
        console.error('Error listando citas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/citas/:id/estado - Cambiar estado (Admin/Encargado/Barbero)
router.put('/:id/estado', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { estado } = req.body;

        const validEstados = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'];
        if (!validEstados.includes(estado)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }

        db.prepare('UPDATE citas SET estado = ? WHERE id = ?').run(estado, id);
        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error actualizando cita:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/citas/perfil - Perfil del cliente logueado (puntos, última visita)
router.get('/perfil', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Acceso solo para clientes' });
        }

        const cliente = db.prepare(`
            SELECT id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro
            FROM clientes
            WHERE id = ?
        `).get(req.user.id);

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(cliente);
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
