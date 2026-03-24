import express from 'express';
import bcrypt from 'bcryptjs';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/usuarios - Listar usuarios del tenant (Solo Admin)
router.get('/', verifyToken, requireTenant, requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        const usuarios = await dbQuery.all(`
            SELECT u.id, u.nombre, u.email, u.activo, u.fecha_creacion,
                   r.nombre_rol as rol, u.id_rol
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id
            WHERE u.barberia_id = ?
            ORDER BY u.id
        `, [req.barberia_id]);

        res.json(usuarios);
    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/usuarios/:id - Obtener usuario por ID (verificado por tenant)
router.get('/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        const usuario = await dbQuery.get(`
            SELECT u.id, u.nombre, u.email, u.activo, u.fecha_creacion,
                   r.nombre_rol as rol, r.id as id_rol
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id
            WHERE u.id = ? AND u.barberia_id = ?
        `, [id, req.barberia_id]);

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
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { nombre, email, id_rol, activo, password } = req.body;

        if (password && password.trim()) {
            const passwordHash = await bcrypt.hash(password, 10);
            await dbQuery.run('UPDATE usuarios SET password_hash = ? WHERE id = ? AND barberia_id = ?', [passwordHash, id, req.barberia_id]);
        }

        await dbQuery.run(`
            UPDATE usuarios
            SET nombre = COALESCE(?, nombre),
                email = COALESCE(?, email),
                id_rol = COALESCE(?, id_rol),
                activo = COALESCE(?, activo)
            WHERE id = ? AND barberia_id = ?
        `, [nombre, email, id_rol, activo, id, req.barberia_id]);

        res.json({ message: 'Usuario actualizado' });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// DELETE /api/usuarios/:id - Desactivar usuario (Solo Admin)
router.delete('/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        await dbQuery.run('UPDATE usuarios SET activo = 0 WHERE id = ? AND barberia_id = ?', [id, req.barberia_id]);

        res.json({ message: 'Usuario desactivado' });
    } catch (error) {
        console.error('Error desactivando usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/usuarios/roles/all - Listar roles disponibles (shared, no tenant filter)
router.get('/roles/all', verifyToken, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        // Roles son globales — excluir SuperAdmin de la lista para admins normales
        const roles = await dbQuery.all("SELECT * FROM roles WHERE nombre_rol != 'SuperAdmin'", []);
        res.json(roles);
    } catch (error) {
        console.error('Error listando roles:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
