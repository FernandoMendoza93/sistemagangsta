import express from 'express';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/servicios - Listar todos los servicios del tenant
router.get('/', verifyToken, requireTenant, (req, res) => {
    try {
        const db = req.app.locals.db;
        const servicios = db.prepare(`
            SELECT id, nombre_servicio, precio, duracion_aprox, activo
            FROM servicios
            WHERE barberia_id = ?
            ORDER BY nombre_servicio
        `).all(req.barberia_id);

        res.json(servicios);
    } catch (error) {
        console.error('Error listando servicios:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/servicios/activos - Solo servicios activos (para POS)
router.get('/activos', verifyToken, requireTenant, (req, res) => {
    try {
        const db = req.app.locals.db;
        const servicios = db.prepare(`
            SELECT id, nombre_servicio, precio, duracion_aprox
            FROM servicios
            WHERE activo = 1 AND barberia_id = ?
            ORDER BY nombre_servicio
        `).all(req.barberia_id);

        res.json(servicios);
    } catch (error) {
        console.error('Error listando servicios activos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/servicios - Crear servicio (Solo Admin)
router.post('/', verifyToken, requireTenant, requireRole(ROLES.ADMIN), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { nombre_servicio, precio, duracion_aprox } = req.body;

        if (!nombre_servicio || !precio) {
            return res.status(400).json({ error: 'Nombre y precio son requeridos' });
        }

        const result = db.prepare(`
            INSERT INTO servicios (nombre_servicio, precio, duracion_aprox, barberia_id)
            VALUES (?, ?, ?, ?)
        `).run(nombre_servicio, precio, duracion_aprox || 30, req.barberia_id);

        res.status(201).json({
            message: 'Servicio creado',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error creando servicio:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/servicios/:id - Actualizar servicio (Solo Admin)
router.put('/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { nombre_servicio, precio, duracion_aprox, activo } = req.body;

        db.prepare(`
            UPDATE servicios 
            SET nombre_servicio = COALESCE(?, nombre_servicio),
                precio = COALESCE(?, precio),
                duracion_aprox = COALESCE(?, duracion_aprox),
                activo = COALESCE(?, activo)
            WHERE id = ? AND barberia_id = ?
        `).run(nombre_servicio, precio, duracion_aprox, activo, id, req.barberia_id);

        res.json({ message: 'Servicio actualizado' });
    } catch (error) {
        console.error('Error actualizando servicio:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// DELETE /api/servicios/:id - Desactivar servicio (Solo Admin)
router.delete('/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        db.prepare('UPDATE servicios SET activo = 0 WHERE id = ? AND barberia_id = ?').run(id, req.barberia_id);

        res.json({ message: 'Servicio desactivado' });
    } catch (error) {
        console.error('Error desactivando servicio:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
