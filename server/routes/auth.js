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

// POST /api/auth/cliente - Acceso del cliente por teléfono + contraseña
router.post('/cliente', async (req, res) => {
    try {
        const { telefono, nombre, password } = req.body;
        const dbQuery = req.app.locals.dbQuery;
        const db = req.app.locals.db;

        if (!telefono || telefono.replace(/\D/g, '').length < 10) {
            return res.status(400).json({ error: 'Teléfono a 10 dígitos es requerido' });
        }

        // Asegurar que las tablas existen
        db.exec(`
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                telefono TEXT,
                password_hash TEXT,
                puntos_lealtad INTEGER DEFAULT 0,
                ultima_visita TEXT,
                fecha_registro TEXT DEFAULT (datetime('now', 'localtime')),
                notas TEXT,
                activo INTEGER DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS citas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_cliente INTEGER NOT NULL,
                id_servicio INTEGER,
                id_barbero INTEGER,
                fecha TEXT NOT NULL,
                hora TEXT NOT NULL,
                estado TEXT DEFAULT 'Pendiente',
                notas TEXT,
                fecha_creacion TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (id_cliente) REFERENCES clientes(id),
                FOREIGN KEY (id_servicio) REFERENCES servicios(id),
                FOREIGN KEY (id_barbero) REFERENCES barberos(id)
            );
        `);

        // Agregar columna password_hash si no existe (para DBs existentes)
        try {
            db.exec('ALTER TABLE clientes ADD COLUMN password_hash TEXT');
        } catch (e) {
            // La columna ya existe, ignorar
        }

        const telefonoLimpio = telefono.replace(/\D/g, '').slice(-10);
        let cliente = await dbQuery.get('SELECT * FROM clientes WHERE telefono = ? AND activo = 1', [telefonoLimpio]);

        if (!cliente) {
            // Cliente nuevo: necesita nombre + contraseña para registrarse
            if (!nombre || !password) {
                return res.status(404).json({
                    error: 'Cliente no encontrado',
                    needsRegistration: true,
                    message: '¿Primera vez? Regístrate para activar tu tarjeta'
                });
            }

            if (password.length < 4) {
                return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
            }

            // Auto-registro con contraseña
            const passwordHash = await bcrypt.hash(password, 10);
            const result = await dbQuery.run(`
                INSERT INTO clientes (nombre, telefono, password_hash)
                VALUES (?, ?, ?)
            `, [nombre.trim(), telefonoLimpio, passwordHash]);

            cliente = await dbQuery.get('SELECT * FROM clientes WHERE id = ?', [result.lastInsertRowid]);
            console.log('✅ Nuevo cliente registrado:', cliente.nombre, telefonoLimpio);
        } else {
            // Cliente existente — verificar contraseña
            if (!cliente.password_hash) {
                // Cliente viejo sin contraseña: necesita crearla
                if (!password) {
                    return res.status(400).json({
                        error: 'Necesitas crear una contraseña',
                        needsPassword: true,
                        message: 'Crea una contraseña para proteger tu cuenta'
                    });
                }
                // Guardar la nueva contraseña
                const passwordHash = await bcrypt.hash(password, 10);
                await dbQuery.run('UPDATE clientes SET password_hash = ? WHERE id = ?', [passwordHash, cliente.id]);
                console.log('✅ Contraseña creada para cliente existente:', cliente.nombre);
            } else {
                // Verificar contraseña
                if (!password) {
                    return res.status(400).json({ error: 'Contraseña requerida' });
                }
                const validPassword = await bcrypt.compare(password, cliente.password_hash);
                if (!validPassword) {
                    return res.status(401).json({ error: 'Contraseña incorrecta' });
                }
            }
            console.log('✅ Login cliente:', cliente.nombre, telefonoLimpio);
        }

        // Generar JWT limitado
        const token = jwt.sign(
            {
                id: cliente.id,
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                rol: 'Cliente',
                tipo: 'cliente'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Acceso exitoso',
            token,
            user: {
                id: cliente.id,
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                puntos_lealtad: cliente.puntos_lealtad,
                ultima_visita: cliente.ultima_visita,
                rol: 'Cliente'
            }
        });

    } catch (error) {
        console.error('❌ Error en auth cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
