import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { initSocket } from './services/socketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar Express e HTTP Server
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;
process.env.TZ = 'America/Mexico_City'; // Enforcement de zona horaria

// Inicializar Socket.io
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Conexión a MySQL
let db = null;

async function initializeDatabase() {
    console.log('🔍 Conectando a MySQL...');
    const mysql = await import('mysql2/promise');

    try {
        const pool = mysql.default.createPool({
            host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
            user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
            password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
            database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'barberia',
            port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            decimalNumbers: true,
            timezone: '-06:00',
            dateStrings: true
        });

        // Probar conexión y forzar time_zone de la sesión
        const connection = await pool.getConnection();
        await connection.query("SET time_zone = '-06:00'");
        console.log('✅ Conectado a MySQL exitosamente (Zona Horaria: -06:00)');
        connection.release();

        db = pool;
    } catch (err) {
        console.error('❌ ERROR FATAL MYSQL: No se pudo conectar a la base de datos.', err.message);
        process.exit(1);
    }
}

// Sanitizar params: MySQL no acepta undefined, convertir a null
const sanitize = (params) => params.map(p => p === undefined ? null : p);

// Query wrapper — MySQL puro
const dbQuery = {
    async all(sql, params = []) {
        const [rows] = await db.query(sql, sanitize(params));
        return rows;
    },

    async get(sql, params = []) {
        const [rows] = await db.query(sql, sanitize(params));
        return rows[0];
    },

    async run(sql, params = []) {
        const [result] = await db.query(sql, sanitize(params));
        return {
            lastInsertRowid: result.insertId,
            changes: result.affectedRows
        };
    },

    async transaction(callback) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const txQuery = {
                async all(sql, params = []) { const [rows] = await conn.query(sql, sanitize(params)); return rows; },
                async get(sql, params = []) { const [rows] = await conn.query(sql, sanitize(params)); return rows[0]; },
                async run(sql, params = []) { const [result] = await conn.query(sql, sanitize(params)); return { lastInsertRowid: result.insertId, changes: result.affectedRows }; }
            };
            const result = await callback(txQuery);
            await conn.commit();
            return result;
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }
};

// Inicializar base de datos antes de cargar rutas
await initializeDatabase();

// Hacer db y query wrapper disponibles
app.locals.db = db;
app.locals.dbQuery = dbQuery;

// Importar rutas después de inicializar DB
const authRoutes = (await import('./routes/auth.js')).default;
const usuariosRoutes = (await import('./routes/usuarios.js')).default;
const barberosRoutes = (await import('./routes/barberos.js')).default;
const serviciosRoutes = (await import('./routes/servicios.js')).default;
const productosRoutes = (await import('./routes/productos.js')).default;
const ventasRoutes = (await import('./routes/ventas.js')).default;
const corteCajaRoutes = (await import('./routes/corteCaja.js')).default;
const reportesRoutes = (await import('./routes/reportes.js')).default;
const clientesRoutes = (await import('./routes/clientes.js')).default;
const citasRoutes = (await import('./routes/citas.js')).default;
const loyaltyRoutes = (await import('./routes/loyalty.js')).default;
const superadminRoutes = (await import('./routes/superadmin.js')).default;
const themesRoutes = (await import('./routes/themes.js')).default;
const horariosRoutes = (await import('./routes/horarios.js')).default;
const notificacionesRoutes = (await import('./routes/notificaciones.js')).default;
const escanerRoutes = (await import('./routes/escaner.js')).default;

// Servir archivos subidos (como Logos) de forma estática
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/barberos', barberosRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/corte-caja', corteCajaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/super', themesRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/escaner', escanerRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Flow Barber Management System',
        database: 'mysql',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Servir frontend estático en producción
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(join(__dirname, '../client/dist')));

    app.get('*', (req, res) => {
        res.sendFile(join(__dirname, '../client/dist/index.html'));
    });
}

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor'
    });
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
    console.log('Servidor activo en puerto:', PORT);
    console.log(`
  ╔════════════════════════════════════════════╗
  ║   FLOW — Barber Management System          ║
  ║   Servidor corriendo en puerto ${PORT}         ║
  ║   Base de datos: MYSQL                     ║
  ║   Entorno: ${(process.env.NODE_ENV || 'development').padEnd(30)}║
  ╚════════════════════════════════════════════╝
  `);
});

export { db, dbQuery };
