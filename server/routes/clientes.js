import express from 'express';
import { verifyToken, requireRole, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/clientes - Listar clientes (con búsqueda opcional ?q=)
router.get('/', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { q } = req.query;

        let query = `
            SELECT id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro, notas, activo
            FROM clientes
            WHERE activo = 1
        `;
        const params = [];

        if (q) {
            query += ` AND (nombre LIKE ? OR telefono LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        query += ` ORDER BY nombre`;

        const clientes = db.prepare(query).all(...params);
        res.json(clientes);
    } catch (error) {
        console.error('Error listando clientes:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/clientes/inactivos - Clientes sin visita en +30 días
router.get('/inactivos', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        const clientes = db.prepare(`
            SELECT id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro, notas,
                   CAST(julianday('now', 'localtime') - julianday(ultima_visita) AS INTEGER) as dias_sin_visita
            FROM clientes
            WHERE activo = 1
              AND ultima_visita IS NOT NULL
              AND julianday('now', 'localtime') - julianday(ultima_visita) > 30
            ORDER BY ultima_visita ASC
        `).all();

        res.json(clientes);
    } catch (error) {
        console.error('Error listando clientes inactivos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/clientes/:id - Detalle de un cliente
router.get('/:id', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const cliente = db.prepare(`
            SELECT id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro, notas, activo
            FROM clientes
            WHERE id = ?
        `).get(id);

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(cliente);
    } catch (error) {
        console.error('Error obteniendo cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/clientes - Crear cliente
router.post('/', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { nombre, telefono, notas } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const result = db.prepare(`
            INSERT INTO clientes (nombre, telefono, notas)
            VALUES (?, ?, ?)
        `).run(nombre, telefono || null, notas || null);

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
router.put('/:id', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { nombre, telefono, notas, puntos_lealtad, activo } = req.body;

        db.prepare(`
            UPDATE clientes 
            SET nombre = COALESCE(?, nombre),
                telefono = COALESCE(?, telefono),
                notas = COALESCE(?, notas),
                puntos_lealtad = COALESCE(?, puntos_lealtad),
                activo = COALESCE(?, activo)
            WHERE id = ?
        `).run(nombre, telefono, notas, puntos_lealtad, activo, id);

        res.json({ message: 'Cliente actualizado' });
    } catch (error) {
        console.error('Error actualizando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// DELETE /api/clientes/:id - Desactivar cliente (soft delete)
router.delete('/:id', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        db.prepare('UPDATE clientes SET activo = 0 WHERE id = ?').run(id);

        res.json({ message: 'Cliente desactivado' });
    } catch (error) {
        console.error('Error desactivando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
