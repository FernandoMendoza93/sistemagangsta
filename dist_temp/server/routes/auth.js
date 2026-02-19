import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const dbQuery = req.app.locals.dbQuery;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario con su rol
        const user = await dbQuery.get(`
      SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, r.nombre_rol as rol
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id
      WHERE u.email = ?
    `, [email]);

        if (!user) {
            console.log('❌ Usuario no encontrado:', email);
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        if (!user.activo) {
            console.log('❌ Usuario desactivado:', email);
            return res.status(401).json({ error: 'Usuario desactivado' });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log('❌ Contraseña incorrecta para:', email);
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        console.log('✅ Login exitoso:', email);

        // Generar JWT
        const token = jwt.sign(
            {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Verificar si el usuario es barbero
        const barbero = await dbQuery.get(`
      SELECT id, turno
      FROM barberos WHERE id_usuario = ?
    `, [user.id]);

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                barbero: barbero || null
            }
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/auth/register (Solo admins pueden registrar usuarios)
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password, id_rol, esBarbero, turno } = req.body;
        const dbQuery = req.app.locals.dbQuery;

        if (!nombre || !email || !password || !id_rol) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Verificar si el email ya existe
        const existingUser = await dbQuery.get('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Hash de la contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario
        const result = await dbQuery.run(`
      INSERT INTO usuarios (nombre, email, password_hash, id_rol)
      VALUES (?, ?, ?, ?)
    `, [nombre, email, passwordHash, id_rol]);

        const userId = result.lastInsertRowid;

        // Si es barbero, crear registro en tabla barberos
        if (esBarbero || id_rol === 3) {
            await dbQuery.run(`
        INSERT INTO barberos (id_usuario, turno)
        VALUES (?, ?)
      `, [userId, turno || 'Completo']);
        }

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            userId
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/auth/me - Obtener usuario actual
router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const dbQuery = req.app.locals.dbQuery;

        const user = await dbQuery.get(`
      SELECT u.id, u.nombre, u.email, r.nombre_rol as rol
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id
      WHERE u.id = ?
    `, [decoded.id]);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const barbero = await dbQuery.get(`
      SELECT id, turno
      FROM barberos WHERE id_usuario = ?
    `, [user.id]);

        res.json({
            ...user,
            barbero: barbero || null
        });

    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
});

export default router;
