import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import { JWT_SECRET, verifyToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Multer config for logo uploads
const uploadsDir = join(__dirname, '../uploads/logos');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        cb(null, `logo-${Date.now()}.${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

const router = express.Router();

// GET /api/auth/mi-barberia — Returns the calling admin's own barberia info (slug, logo, color)
router.get('/mi-barberia', verifyToken, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const barberia_id = req.user?.barberia_id;

        if (!barberia_id) {
            return res.status(400).json({ error: 'Este usuario no tiene una barbería asignada' });
        }

        const barberia = await dbQuery.get(
            `SELECT b.id, b.nombre, b.logo_url, b.color_acento, b.slug, b.plan, b.fecha_vencimiento, b.activo,
                    t.bg_main, t.bg_surface, t.accent_primary, t.accent_secondary, t.text_main, t.text_muted, t.clase_glass
             FROM barberias b
             LEFT JOIN temas t ON b.tema_id = t.id
             WHERE b.id = ?`,
            [barberia_id]
        );

        if (!barberia) {
            return res.status(404).json({ error: 'Barbería no encontrada' });
        }

        res.json(barberia);
    } catch (error) {
        console.error('Error obteniendo mi-barberia:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/auth/login — Staff login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const dbQuery = req.app.locals.dbQuery;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contrasena son requeridos' });
        }

        // Buscar usuario con su rol + barberia
        const user = await dbQuery.get(`
            SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, u.barberia_id,
                   r.nombre_rol as rol,
                   b.nombre as barberia_nombre, b.color_acento, b.logo_url, b.activo as barberia_activa,
                   b.slug as barberia_slug,
                   t.bg_main, t.bg_surface, t.accent_primary, t.accent_secondary, t.text_main, t.text_muted, t.clase_glass
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id
            LEFT JOIN barberias b ON u.barberia_id = b.id
            LEFT JOIN temas t ON b.tema_id = t.id
            WHERE u.email = ?
        `, [email]);

        if (!user) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        if (!user.activo) {
            return res.status(401).json({ error: 'Usuario desactivado' });
        }

        // SuperAdmin no necesita barberia activa
        if (user.rol !== 'SuperAdmin' && user.barberia_id) {
            if (user.barberia_activa === 0) {
                return res.status(403).json({ error: 'La suscripcion de esta barberia esta inactiva. Contacta al administrador de Flow.' });
            }
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // JWT con barberia_id + slug + theme info (opcional para reducir carga, mejor fetch me)
        const token = jwt.sign(
            {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                barberia_id: user.barberia_id || null,
                barberia_nombre: user.barberia_nombre || null,
                barberia_slug: user.barberia_slug || null,
                logo_url: user.logo_url || null
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Verificar si es barbero
        const barbero = await dbQuery.get('SELECT id, turno FROM barberos WHERE id_usuario = ?', [user.id]);

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                barberia_id: user.barberia_id,
                barberia_nombre: user.barberia_nombre,
                barberia_slug: user.barberia_slug,
                color_acento: user.color_acento,
                logo_url: user.logo_url,
                bg_main: user.bg_main,
                bg_surface: user.bg_surface,
                accent_primary: user.accent_primary,
                accent_secondary: user.accent_secondary,
                text_main: user.text_main,
                text_muted: user.text_muted,
                clase_glass: user.clase_glass,
                barbero: barbero || null
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/auth/register — Staff registration (admin creates users within their barberia)
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password, id_rol, esBarbero, turno } = req.body;
        const dbQuery = req.app.locals.dbQuery;

        if (!nombre || !email || !password || !id_rol) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        const existingUser = await dbQuery.get('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya esta registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Use barberia_id from the authenticated admin (via header or default to 1)
        const authHeader = req.headers['authorization'];
        let barberia_id = 1;
        if (authHeader) {
            try {
                const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
                barberia_id = decoded.barberia_id || 1;
            } catch (e) { /* default */ }
        }

        const result = await dbQuery.run(`
            INSERT INTO usuarios (nombre, email, password_hash, id_rol, barberia_id)
            VALUES (?, ?, ?, ?, ?)
        `, [nombre, email, passwordHash, id_rol, barberia_id]);

        const userId = result.lastInsertRowid;

        if (esBarbero || id_rol === 3) {
            await dbQuery.run('INSERT INTO barberos (id_usuario, turno, barberia_id) VALUES (?, ?, ?)',
                [userId, turno || 'Completo', barberia_id]);
        }

        res.status(201).json({ message: 'Usuario creado exitosamente', userId });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/auth/me
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
            SELECT u.id, u.nombre, u.email, u.barberia_id, r.nombre_rol as rol,
                   b.nombre as barberia_nombre, b.logo_url, b.slug as barberia_slug,
                   t.bg_main, t.bg_surface, t.accent_primary, t.accent_secondary, t.text_main, t.text_muted, t.clase_glass
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id
            LEFT JOIN barberias b ON u.barberia_id = b.id
            LEFT JOIN temas t ON b.tema_id = t.id
            WHERE u.id = ?
        `, [decoded.id]);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const barbero = await dbQuery.get('SELECT id, turno FROM barberos WHERE id_usuario = ?', [user.id]);

        res.json({
            ...user,
            barbero: barbero || null
        });

    } catch (error) {
        return res.status(403).json({ error: 'Token invalido' });
    }
});

// POST /api/auth/cliente — Client login/registration
router.post('/cliente', async (req, res) => {
    try {
        const { telefono, nombre, password, barberia_slug } = req.body;
        const dbQuery = req.app.locals.dbQuery;
        const db = req.app.locals.db;

        if (!telefono || telefono.replace(/\D/g, '').length < 10) {
            return res.status(400).json({ error: 'Telefono a 10 digitos es requerido' });
        }

        // Determine barberia_id from slug or default to 1
        let barberia_id = 1;
        if (barberia_slug) {
            const barb = await dbQuery.get('SELECT id, activo FROM barberias WHERE slug = ?', [barberia_slug]);
            if (barb) {
                if (!barb.activo) {
                    return res.status(403).json({ error: 'Esta barberia no esta activa' });
                }
                barberia_id = barb.id;
            }
        }



        const telefonoLimpio = telefono.replace(/\D/g, '').slice(-10);

        // Search client within the specific barberia
        let cliente = await dbQuery.get(
            'SELECT * FROM clientes WHERE telefono = ? AND barberia_id = ? AND activo = 1',
            [telefonoLimpio, barberia_id]
        );

        if (!cliente) {
            if (!nombre || !password) {
                return res.status(404).json({
                    error: 'Cliente no encontrado',
                    needsRegistration: true,
                    message: 'Primera vez? Registrate para activar tu tarjeta'
                });
            }

            if (password.length < 4) {
                return res.status(400).json({ error: 'La contrasena debe tener al menos 4 caracteres' });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const result = await dbQuery.run(`
                INSERT INTO clientes (nombre, telefono, password_hash, barberia_id)
                VALUES (?, ?, ?, ?)
            `, [nombre.trim(), telefonoLimpio, passwordHash, barberia_id]);

            cliente = await dbQuery.get('SELECT * FROM clientes WHERE id = ?', [result.lastInsertRowid]);
        } else {
            if (!cliente.password_hash) {
                if (!password) {
                    return res.status(400).json({
                        error: 'Necesitas crear una contrasena',
                        needsPassword: true
                    });
                }
                const passwordHash = await bcrypt.hash(password, 10);
                await dbQuery.run('UPDATE clientes SET password_hash = ? WHERE id = ?', [passwordHash, cliente.id]);
            } else {
                if (!password) {
                    return res.status(400).json({ error: 'Contrasena requerida' });
                }
                const validPassword = await bcrypt.compare(password, cliente.password_hash);
                if (!validPassword) {
                    return res.status(401).json({ error: 'Contrasena incorrecta' });
                }
            }
        }

        const token = jwt.sign(
            {
                id: cliente.id,
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                rol: 'Cliente',
                tipo: 'cliente',
                barberia_id: barberia_id
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
                rol: 'Cliente',
                barberia_id: barberia_id
            }
        });

    } catch (error) {
        console.error('Error en auth cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/auth/barberia-info/:slug — Public endpoint to fetch barberia branding
router.get('/barberia-info/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const dbQuery = req.app.locals.dbQuery;

        const barberia = await dbQuery.get(
            `SELECT b.nombre, b.logo_url, b.color_acento, b.activo,
                    t.bg_main, t.bg_surface, t.accent_primary, t.accent_secondary, t.text_main, t.text_muted, t.clase_glass
             FROM barberias b
             LEFT JOIN temas t ON b.tema_id = t.id
             WHERE b.slug = ?`,
            [slug]
        );

        if (!barberia) {
            return res.status(404).json({ error: 'Barbería no encontrada' });
        }

        if (!barberia.activo) {
            return res.status(403).json({ error: 'Esta barbería no está activa. Contacta a tu administrador.' });
        }

        res.json({
            nombre: barberia.nombre,
            logo_url: barberia.logo_url,
            tema: {
                bg_main: barberia.bg_main,
                bg_surface: barberia.bg_surface,
                accent_primary: barberia.accent_primary,
                accent_secondary: barberia.accent_secondary,
                text_main: barberia.text_main,
                text_muted: barberia.text_muted,
                clase_glass: barberia.clase_glass
            }
        });

    } catch (error) {
        console.error('Error obteniendo info de barbería:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/auth/register-barberia — Public registration (multipart for logo)
router.post('/register-barberia', upload.single('logo'), async (req, res) => {
    try {
        const { nombre, telefono_whatsapp, email, plan, password, direccion } = req.body;
        const dbQuery = req.app.locals.dbQuery;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contrasena son requeridos' });
        }

        // Generate slug
        const slug = nombre.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);

        // Check if slug exists
        const existingSlug = await dbQuery.get('SELECT id FROM barberias WHERE slug = ?', [slug]);
        if (existingSlug) {
            return res.status(400).json({ error: 'Ya existe una barberia con un nombre similar' });
        }

        // Check if email is taken
        const existingEmail = await dbQuery.get('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingEmail) {
            return res.status(400).json({ error: 'Este email ya esta registrado' });
        }

        // Logo path
        const logo_url = req.file ? `/uploads/logos/${req.file.filename}` : null;

        // Calculate subscription dates
        const selectedPlan = plan === 'anual' ? 'anual' : 'mensual';
        const precio = selectedPlan === 'anual' ? 2999 : 299;
        const vencimiento = selectedPlan === 'anual'
            ? dayjs().add(1, 'year').format('YYYY-MM-DD HH:mm:ss')
            : dayjs().add(1, 'month').format('YYYY-MM-DD HH:mm:ss');

        // Create barberia (INACTIVE until SuperAdmin confirms payment)
        const barbResult = await dbQuery.run(`
            INSERT INTO barberias (nombre, slug, telefono_whatsapp, email_contacto, direccion, logo_url, plan, precio_plan, fecha_vencimiento, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [nombre, slug, telefono_whatsapp || '', email, direccion || '', logo_url, selectedPlan, precio, vencimiento]);

        const barberia_id = barbResult.lastInsertRowid;

        // Create admin user for this barberia
        const passwordHash = await bcrypt.hash(password, 10);
        await dbQuery.run(`
            INSERT INTO usuarios (nombre, email, password_hash, id_rol, barberia_id)
            VALUES (?, ?, ?, 1, ?)
        `, [`Admin ${nombre}`, email, passwordHash, barberia_id]);

        // Create default services
        const defaultServices = [
            ['Corte', 200, 30],
            ['Barba', 200, 60],
            ['Corte + Barba', 300, 90],
        ];
        for (const [servNombre, precio_s, duracion] of defaultServices) {
            await dbQuery.run(
                'INSERT INTO servicios (nombre_servicio, precio, duracion_aprox, barberia_id) VALUES (?, ?, ?, ?)',
                [servNombre, precio_s, duracion, barberia_id]
            );
        }

        // Create default categories
        const defaultCategories = [
            ['Venta', 'Productos para venta al cliente'],
            ['Insumo Limpieza', 'Productos de limpieza y desinfección'],
            ['Herramientas', 'Instrumentos de trabajo']
        ];
        for (const [catNombre, catDesc] of defaultCategories) {
            await dbQuery.run(
                'INSERT INTO categorias (nombre, descripcion, barberia_id) VALUES (?, ?, ?)',
                [catNombre, catDesc, barberia_id]
            );
        }

        res.status(201).json({
            message: 'Barberia registrada exitosamente',
            barberia: { id: barberia_id, nombre, slug },
            credentials: { email, message: 'Usa la contrasena que proporcionaste para ingresar al panel' }
        });

    } catch (error) {
        console.error('Error registrando barberia:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
