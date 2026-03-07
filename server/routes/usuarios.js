import express from 'express';
import bcrypt from 'bcryptjs';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/usuarios - Listar usuarios del tenant (Solo Admin)
router.get('/', verifyToken, requireTenant, requireRole(ROLES.ADMIN), (req, res) => {
    try {
        const db = req.app.locals.db;

        const usuarios = db.prepare(`
            SELECT u.id, u.nombre, u.email, u.activo, u.fecha_creacion,
                   r.nombre_rol as rol, u.id_rol
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id
            WHERE u.barberia_id = ?
            ORDER BY u.id
        `).all(req.barberia_id);

        res.json(usuarios);
    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/usuarios/:id - Obtener usuario por ID (verificado por tenant)
router.get('/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const usuario = db.prepare(`
            SELECT u.id, u.nombre, u.email, u.activo, u.fecha_creacion,
                   r.nombre_rol as rol, r.id as id_rol
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id
            WHERE u.id = ? AND u.barberia_id = ?
        `).get(id, req.barberia_id);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(usuario);
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/usuarios/:id - Actualizar usuario (Solo Admin, verificado por tenant)
router.put('/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { nombre, email, id_rol, activo, password } = req.body;

        if (password && password.trim()) {
            const passwordHash = await bcrypt.hash(password, 10);
            db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ? AND barberia_id = ?').run(passwordHash, id, req.barberia_id);
        }

        db.prepare(`
            UPDATE usuarios 
            SET nombre = COALESCE(?, nombre),
                email = COALESCE(?, email),
                id_rol = COALESCE(?, id_rol),
                activo = COALESCE(?, activo)
            WHERE id = ? AND barberia_id = ?
        `).run(nombre, email, id_rol, activo, id, req.barberia_id);

        res.json({ message: 'Usuario actualizado' });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// DELETE /api/usuarios/:id - Desactivar usuario (Solo Admin)
router.delete('/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ? AND barberia_id = ?').run(id, req.barberia_id);

        res.json({ message: 'Usuario desactivado' });
    } catch (error) {
        console.error('Error desactivando usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/usuarios/roles/all - Listar roles disponibles (shared, no tenant filter)
router.get('/roles/all', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        // Roles son globales — excluir SuperAdmin de la lista para admins normales
        const roles = db.prepare("SELECT * FROM roles WHERE nombre_rol != 'SuperAdmin'").all();
        res.json(roles);
    } catch (error) {
        console.error('Error listando roles:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
