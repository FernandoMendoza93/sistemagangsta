import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;
process.env.TZ = 'America/Mexico_City'; // Enforcement de zona horaria

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Variables globales para DB
let db = null;
let dbType = null;

// Función para inicializar base de datos con detección automática
async function initializeDatabase() {
    // Intentar MySQL SOLO si hay DB_HOST configurado explícitamente
    if (process.env.DB_HOST) {
        try {
            console.log('🔍 Intentando conectar a MySQL...');
            const mysql = await import('mysql2/promise');

            const dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'barberia',
                port: process.env.DB_PORT || 3306,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            };

            const pool = mysql.default.createPool(dbConfig);

            // Probar conexión
            const connection = await pool.getConnection();
            console.log('✅ Conectado a MySQL exitosamente');
            connection.release();

            db = pool;
            dbType = 'mysql';

            return;
        } catch (error) {
            console.log('⚠️  MySQL no disponible:', error.message);
            console.log('🔄 Cambiando a SQLite...');
        }
    }

    // Fallback a SQLite (para desarrollo local y Railway)
    try {
        console.log('🚀 Ejecutando scripts de migración multi-tenant antes de levantar base...');
        await import('./scripts/migrate-multitenant.js');
        await import('./scripts/manual-stamp-update.js');

        console.log('🔍 Inicializando SQLite...');
        const Database = (await import('better-sqlite3')).default;
        const { readFileSync, existsSync, copyFileSync, rmSync } = await import('fs');

        const dbPath = process.env.DATABASE_URL || join(__dirname, 'data', 'database.sqlite');

        const sqliteDb = new Database(dbPath);
        sqliteDb.pragma('journal_mode = WAL');

        // Verificar si necesita inicialización
        const tableCheck = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='roles'").get();
        if (!tableCheck) {
            console.log('📦 Inicializando base de datos SQLite...');
            const schemaPath = join(__dirname, 'schema.sql');
            if (existsSync(schemaPath)) {
                const schema = readFileSync(schemaPath, 'utf-8');
                sqliteDb.exec(schema);
                console.log('✅ Schema SQLite ejecutado');
            }
        }

        db = sqliteDb;
        dbType = 'sqlite';

        // Migración: agregar columna 'estado' a ventas_cabecera si no existe
        try {
            const colCheck = sqliteDb.prepare("PRAGMA table_info(ventas_cabecera)").all();
            const hasEstado = colCheck.some(c => c.name === 'estado');
            if (!hasEstado) {
                sqliteDb.exec("ALTER TABLE ventas_cabecera ADD COLUMN estado TEXT DEFAULT 'completada'");
                console.log('🔄 Migración: columna estado agregada a ventas_cabecera');
            }
        } catch (e) {
            // La tabla podría no existir aún, se creará con el schema
        }

        // Autoencendido: Poblar datos iniciales si 'clientes' está vacía
        try {
            const count = sqliteDb.prepare("SELECT COUNT(*) AS count FROM clientes").get().count;
            if (count === 0) {
                const initDataPath = join(__dirname, 'data_seed', 'init_data.sql');
                if (existsSync(initDataPath)) {
                    console.log('🌱 Poblando base de datos desde init_data.sql...');
                    const initSql = readFileSync(initDataPath, 'utf-8');
                    sqliteDb.exec(initSql);
                    console.log('✅ Sincronización de datos mediante SQL Dump completada');
                }
            }
        } catch (e) {
            console.error('⚠️ Error al poblar base de datos inicial:', e.message);
        }

        console.log('✅ SQLite inicializado correctamente');

    } catch (error) {
        console.error('❌ Error fatal inicializando base de datos:', error);
        process.exit(1);
    }
}

// Wrapper para queries que funciona con ambas DBs
const dbQuery = {
    async all(sql, params = []) {
        if (dbType === 'mysql') {
            const [rows] = await db.execute(sql, params);
            return rows;
        } else {
            return db.prepare(sql).all(...params);
        }
    },

    async get(sql, params = []) {
        if (dbType === 'mysql') {
            const [rows] = await db.execute(sql, params);
            return rows[0];
        } else {
            return db.prepare(sql).get(...params);
        }
    },

    async run(sql, params = []) {
        if (dbType === 'mysql') {
            const [result] = await db.execute(sql, params);
            return {
                lastInsertRowid: result.insertId,
                changes: result.affectedRows
            };
        } else {
            return db.prepare(sql).run(...params);
        }
    }
};

// Inicializar base de datos antes de cargar rutas
await initializeDatabase();

// Hacer db y query wrapper disponibles
app.locals.db = db;
app.locals.dbType = dbType;
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

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Flow Barber Management System',
        database: dbType,
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
app.listen(PORT, '0.0.0.0', () => {
    console.log('Servidor activo en puerto:', PORT);
    console.log(`
  ╔════════════════════════════════════════════╗
  ║   FLOW — Barber Management System          ║
  ║   Servidor corriendo en puerto ${PORT}         ║
  ║   Base de datos: ${dbType.toUpperCase().padEnd(26)}║
  ║   Entorno: ${(process.env.NODE_ENV || 'development').padEnd(30)}║
  ╚════════════════════════════════════════════╝
  `);
});

export { db, dbType, dbQuery };
