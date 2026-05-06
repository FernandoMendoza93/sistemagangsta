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
                   r.nombre_rol as rol, u.id_rol, b.telefono_whatsapp as whatsapp
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id
            LEFT JOIN barberos b ON b.id_usuario = u.id
            WHERE u.barberia_id = ?
            ORDER BY u.id
        `, [req.barberia_id]);

        res.json(usuarios);
    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/usuarios/staff-admin - Obtener lista de administradores/dueños del tenant
router.get('/staff-admin', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        console.log("Consultando staff para la barbería:", req.barberia_id);
        const dbQuery = req.app.locals.dbQuery;

        // DEBUG: Imprimir cuántos usuarios encuentra sin filtrar por rol
        const usuariosRaw = await dbQuery.all('SELECT id, nombre, email FROM usuarios WHERE barberia_id = ?', [req.barberia_id]);
        console.log("DEBUG: Total usuarios en esta barberia_id (sin filtro de roles):", usuariosRaw.length);
        console.log("DEBUG: Usuarios en barberia:", usuariosRaw);

        const usuarios = await dbQuery.all(`
            SELECT u.id, u.nombre, u.email as correo 
            FROM usuarios u
            LEFT JOIN roles r ON u.id_rol = r.id
            WHERE u.barberia_id = ? 
            AND (LOWER(r.nombre_rol) LIKE '%admin%' OR LOWER(r.nombre_rol) LIKE '%encargado%')
            AND u.activo = 1
        `, [req.barberia_id]);
        
        console.log("DEBUG: Usuarios filtrados a retornar:", usuarios);

        res.json(usuarios);
    } catch (error) {
        console.error('Error listando staff admin:', error);
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
                   r.nombre_rol as rol, r.id as id_rol, b.telefono_whatsapp as whatsapp
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id
            LEFT JOIN barberos b ON b.id_usuario = u.id
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
        const { nombre, email, id_rol, activo, password, whatsapp } = req.body;
        const telefono_whatsapp = whatsapp; // Mapeo para consistencia con tu prompt

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

        if (id_rol) {
            const roleInfo = await dbQuery.get('SELECT nombre_rol FROM roles WHERE id = ?', [id_rol]);
            const checkBarber = await dbQuery.get('SELECT id, estado FROM barberos WHERE id_usuario = ? AND barberia_id = ?', [id, req.barberia_id]);

            if (roleInfo && roleInfo.nombre_rol === 'Barbero') {
                if (!checkBarber) {
                    await dbQuery.run(`
                        INSERT INTO barberos (id_usuario, porcentaje_comision, estado, turno, barberia_id, telefono_whatsapp)
                        VALUES (?, 0.50, 'Activo', 'Completo', ?, ?)
                    `, [id, req.barberia_id, telefono_whatsapp || null]);
                } else {
                    // Actualización explícita del número
                    await dbQuery.run(`
                        UPDATE barberos 
                        SET estado = 'Activo', 
                            telefono_whatsapp = ? 
                        WHERE id = ?
                    `, [telefono_whatsapp || null, checkBarber.id]);
                }
            } else {
                // Soft-Delete: Inactivar perfil público si el nuevo rol ya no es Barbero
                if (checkBarber && checkBarber.estado !== 'Inactivo') {
                    await dbQuery.run("UPDATE barberos SET estado = 'Inactivo' WHERE id = ?", [checkBarber.id]);
                }
            }
        }

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
