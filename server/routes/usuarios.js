import express from 'express';
import bcrypt from 'bcryptjs';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

// Configuración de Cloudinary para fotos de barberos
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'flow_barber_staff',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: (req, file) => `barber_${req.params.id}_${Date.now()}`
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB máximo
});

// POST /api/usuarios - Crear usuario (Solo Admin)
router.post('/', verifyToken, requireTenant, requireRole(ROLES.ADMIN), upload.single('foto'), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { nombre, email, password, id_rol, whatsapp, instagram, turno } = req.body;
        const telefono_whatsapp = whatsapp;

        if (!nombre || !email || !password || !id_rol) {
            return res.status(400).json({ error: 'Nombre, email, password e id_rol son requeridos' });
        }

        const existingUser = await dbQuery.get('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya esta registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        let foto_url = null;
        if (req.file) {
            foto_url = req.file.path;
        }

        const result = await dbQuery.run(`
            INSERT INTO usuarios (nombre, email, password_hash, id_rol, barberia_id, activo)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [nombre, email, passwordHash, id_rol, req.barberia_id]);

        const userId = result.lastInsertRowid;

        const roleInfo = await dbQuery.get('SELECT nombre_rol FROM roles WHERE id = ?', [id_rol]);
        if (roleInfo && roleInfo.nombre_rol === 'Barbero') {
            await dbQuery.run(`
                INSERT INTO barberos (id_usuario, turno, barberia_id, telefono_whatsapp, instagram, foto_url, estado, porcentaje_comision)
                VALUES (?, ?, ?, ?, ?, ?, 'Activo', 0.50)
            `, [userId, turno || 'Completo', req.barberia_id, telefono_whatsapp || null, instagram || null, foto_url]);
        }

        res.status(201).json({ message: 'Usuario creado exitosamente', userId, foto_url });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/usuarios - Listar usuarios del tenant (Solo Admin)
router.get('/', verifyToken, requireTenant, requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        const usuarios = await dbQuery.all(`
            SELECT u.id, u.nombre, u.email, u.activo, u.fecha_creacion,
                   r.nombre_rol as rol, u.id_rol, b.telefono_whatsapp as whatsapp,
                   b.instagram, b.foto_url, b.porcentaje_comision
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
                   r.nombre_rol as rol, r.id as id_rol, b.telefono_whatsapp as whatsapp,
                   b.instagram, b.foto_url
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
router.put('/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN), upload.single('foto'), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { nombre, email, id_rol, activo, password, whatsapp, instagram, porcentaje_comision } = req.body;
        const telefono_whatsapp = whatsapp; // Mapeo para consistencia con tu prompt
        
        let foto_url = req.body.foto_url; // Si mandan la URL actual
        console.log('DEBUG: Foto URL de body:', req.body.foto_url);
        console.log('DEBUG: File recibido:', req.file ? req.file.path : 'Ninguno');

        if (req.file) {
            foto_url = req.file.path; // URL de Cloudinary
        }
        console.log('DEBUG: Foto URL final a guardar:', foto_url);

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
                        INSERT INTO barberos (id_usuario, porcentaje_comision, estado, turno, barberia_id, telefono_whatsapp, instagram, foto_url)
                        VALUES (?, 0.50, 'Activo', 'Completo', ?, ?, ?, ?)
                    `, [id, req.barberia_id, telefono_whatsapp || null, instagram || null, foto_url || null]);
                } else {
                    // Actualización explícita del perfil del barbero
                    console.log('DEBUG: Actualizando perfil de barbero con foto:', foto_url || 'NULL');
                    await dbQuery.run(`
                        UPDATE barberos 
                        SET estado = 'Activo', 
                            telefono_whatsapp = ?,
                            instagram = ?,
                            foto_url = ?,
                            porcentaje_comision = ?
                        WHERE id = ?
                    `, [telefono_whatsapp || null, instagram || null, foto_url || null, porcentaje_comision ? parseFloat(porcentaje_comision) / 100 : 0.50, checkBarber.id]);
                }
            } else {
                // Soft-Delete: Inactivar perfil público si el nuevo rol ya no es Barbero
                if (checkBarber && checkBarber.estado !== 'Inactivo') {
                    await dbQuery.run("UPDATE barberos SET estado = 'Inactivo' WHERE id = ?", [checkBarber.id]);
                }
            }
        }

        res.json({ message: 'Usuario actualizado', foto_url });
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
