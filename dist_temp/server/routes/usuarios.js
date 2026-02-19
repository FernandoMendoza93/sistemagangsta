import express from 'express';
import { verifyToken, requireRole, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/usuarios - Listar todos los usuarios (Solo Admin)
router.get('/', verifyToken, requireRole(ROLES.ADMIN), (req, res) => {
    try {
        const db = req.app.locals.db;

        const usuarios = db.prepare(`
      SELECT u.id, u.nombre, u.email, u.activo, u.fecha_creacion,
             r.nombre_rol as rol
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id
      ORDER BY u.id
    `).all();

        res.json(usuarios);
    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/usuarios/:id - Obtener usuario por ID
router.get('/:id', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const usuario = db.prepare(`
      SELECT u.id, u.nombre, u.email, u.activo, u.fecha_creacion,
             r.nombre_rol as rol, r.id as id_rol
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id
      WHERE u.id = ?
    `).get(id);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(usuario);
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/usuarios/:id - Actualizar usuario (Solo Admin)
router.put('/:id', verifyToken, requireRole(ROLES.ADMIN), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { nombre, email, id_rol, activo } = req.body;

        db.prepare(`
      UPDATE usuarios 
      SET nombre = COALESCE(?, nombre),
          email = COALESCE(?, email),
          id_rol = COALESCE(?, id_rol),
          activo = COALESCE(?, activo)
      WHERE id = ?
    `).run(nombre, email, id_rol, activo, id);

        res.json({ message: 'Usuario actualizado' });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// DELETE /api/usuarios/:id - Desactivar usuario (Solo Admin)
router.delete('/:id', verifyToken, requireRole(ROLES.ADMIN), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        // No eliminamos, solo desactivamos
        db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ?').run(id);

        res.json({ message: 'Usuario desactivado' });
    } catch (error) {
        console.error('Error desactivando usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/usuarios/roles/all - Listar roles disponibles
router.get('/roles/all', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const roles = db.prepare('SELECT * FROM roles').all();
        res.json(roles);
    } catch (error) {
        console.error('Error listando roles:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
