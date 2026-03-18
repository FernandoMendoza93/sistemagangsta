/**
 * Flow SaaS - Multi-Tenant Migration Script
 * Adds barberias table and barberia_id to all existing tables.
 * Safe to run multiple times (idempotent).
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, copyFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = process.env.DATABASE_URL || join(__dirname, '../data/database.sqlite');

const isNewDB = !existsSync(dbPath);

// Backup with timestamp — NEVER overwrites the original
if (!isNewDB) {
    const now = new Date();
    const ts = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
    const backupPath = join(dirname(dbPath), `database_backup_${ts}.sqlite`);
    copyFileSync(dbPath, backupPath);
    console.log(`Backup created: ${backupPath}`);
} else {
    console.log('Fresh install — no backup needed. Schema + init_data.sql will build it from index.js.');
}

// Only run migration if the DB already existed (not a fresh install)
if (isNewDB) {
    console.log('Skipping migration steps — fresh database will be built by index.js schema.');
} else {

const db = new Database(dbPath);
db.pragma('foreign_keys = OFF'); // Disable for migration

function columnExists(table, column) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some(c => c.name === column);
}

function tableExists(table) {
    const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
    return !!row;
}

// ==========================================
// STEP 1: Create barberias table
// ==========================================
console.log('\n--- Step 1: Creating barberias table ---');

if (!tableExists('barberias')) {
    db.exec(`
        CREATE TABLE barberias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            logo_url TEXT,
            color_acento TEXT DEFAULT '#FF6B4A',
            telefono_whatsapp TEXT,
            email_contacto TEXT,
            direccion TEXT,
            plan TEXT DEFAULT 'mensual' CHECK(plan IN ('mensual','anual','trial')),
            precio_plan REAL DEFAULT 299,
            fecha_suscripcion TEXT DEFAULT (datetime('now','localtime')),
            fecha_vencimiento TEXT,
            activo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
    `);
    console.log('  Created barberias table');
} else {
    console.log('  barberias table already exists');
}

// ==========================================
// STEP 2: Seed The Gangsta as first tenant
// ==========================================
console.log('\n--- Step 2: Seeding The Gangsta as tenant #1 ---');

const existing = db.prepare('SELECT id FROM barberias WHERE id = 1').get();
if (!existing) {
    db.prepare(`
        INSERT INTO barberias (id, nombre, slug, telefono_whatsapp, email_contacto, plan, precio_plan, fecha_vencimiento)
        VALUES (1, 'The Gangsta Barber Shop', 'the-gangsta', '529511955349', 'admin@barberia.com', 'anual', 0, datetime('now', '+1 year', 'localtime'))
    `).run();
    console.log('  Inserted The Gangsta (id=1)');
} else {
    console.log('  The Gangsta already exists');
}

// ==========================================
// STEP 3: Add barberia_id to all tables
// ==========================================
console.log('\n--- Step 3: Adding barberia_id to tables ---');

const tablesToMigrate = [
    'usuarios',
    'barberos',
    'servicios',
    'clientes',
    'citas',
    'ventas_cabecera',
    'ventas_detalle',
    'categorias',
    'productos',
    'movimientos_inventario',
    'cortes_caja',
    'gastos',
    'entradas_efectivo',
    'comisiones_pendientes',
    'comisiones_pagadas',
];

for (const table of tablesToMigrate) {
    if (!tableExists(table)) {
        console.log(`  SKIP ${table} (table doesn't exist)`);
        continue;
    }
    if (columnExists(table, 'barberia_id')) {
        console.log(`  SKIP ${table} (barberia_id already exists)`);
        continue;
    }
    db.exec(`ALTER TABLE ${table} ADD COLUMN barberia_id INTEGER DEFAULT 1 REFERENCES barberias(id)`);
    console.log(`  ADDED barberia_id to ${table}`);
}

if (!columnExists('clientes', 'password_hash')) {
    db.exec(`ALTER TABLE clientes ADD COLUMN password_hash TEXT`);
    console.log(`  ADDED password_hash to clientes`);
}

// Also check loyalty_tokens if it exists
if (tableExists('loyalty_tokens') && !columnExists('loyalty_tokens', 'barberia_id')) {
    db.exec(`ALTER TABLE loyalty_tokens ADD COLUMN barberia_id INTEGER DEFAULT 1 REFERENCES barberias(id)`);
    console.log('  ADDED barberia_id to loyalty_tokens');
}

// Check and create visitas_lealtad if it doesn't exist
if (!tableExists('visitas_lealtad')) {
    db.exec(`
        CREATE TABLE visitas_lealtad (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_cliente INTEGER NOT NULL,
            barberia_id INTEGER NOT NULL,
            id_barbero INTEGER,
            fecha TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (id_cliente) REFERENCES clientes(id),
            FOREIGN KEY (barberia_id) REFERENCES barberias(id),
            FOREIGN KEY (id_barbero) REFERENCES barberos(id)
        );
    `);
    console.log('  Created visitas_lealtad table (Migration patch)');
} else {
    // If it exists, ensure it has barberia_id too (if it was created before multitenant)
    if (!columnExists('visitas_lealtad', 'barberia_id')) {
        db.exec(`ALTER TABLE visitas_lealtad ADD COLUMN barberia_id INTEGER DEFAULT 1 REFERENCES barberias(id)`);
        console.log('  ADDED barberia_id to visitas_lealtad');
    }
}

// ==========================================
// STEP 4: Add SuperAdmin role
// ==========================================
console.log('\n--- Step 4: Adding SuperAdmin role ---');

const saRole = db.prepare('SELECT id FROM roles WHERE nombre_rol = ?').get('SuperAdmin');
if (!saRole) {
    db.prepare('INSERT INTO roles (id, nombre_rol) VALUES (4, ?)').run('SuperAdmin');
    console.log('  Created SuperAdmin role (id=4)');
} else {
    console.log('  SuperAdmin role already exists');
}

// ==========================================
// STEP 5: Create SuperAdmin user (Fernando Mendoza's main account)
// ==========================================
console.log('\n--- Step 5: Creating SuperAdmin user ---');

// Check if superadmin@flow.com exists
const saUser = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('superadmin@flow.com');
if (!saUser) {
    // Password: admin123 (same bcrypt hash as admin)
    db.prepare(`
        INSERT INTO usuarios (nombre, email, password_hash, id_rol, activo, barberia_id)
        VALUES ('Fernando Mendoza', 'superadmin@flow.com', '$2a$10$LSqZn7RarDawowdFon0BKOv2klo6Y13HCwU8Wf8INmVFFwSDdaSJi', 4, 1, NULL)
    `).run();
    console.log('  Created SuperAdmin user: superadmin@flow.com / admin123');
} else {
    console.log('  SuperAdmin user already exists');
}

// ==========================================
// STEP 6: Create indexes for barberia_id
// ==========================================
console.log('\n--- Step 6: Creating indexes ---');

const indexedTables = ['usuarios', 'clientes', 'citas', 'ventas_cabecera', 'servicios', 'productos'];
for (const table of indexedTables) {
    if (tableExists(table) && columnExists(table, 'barberia_id')) {
        try {
            db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_barberia ON ${table}(barberia_id)`);
            console.log(`  Created index on ${table}.barberia_id`);
        } catch (e) {
            console.log(`  Index on ${table}.barberia_id already exists or error: ${e.message}`);
        }
    }
}

db.pragma('foreign_keys = ON');
db.exec(`
    CREATE TABLE IF NOT EXISTS horarios_barberos (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        id_barbero  INTEGER NOT NULL,
        dia_semana  INTEGER NOT NULL CHECK(dia_semana BETWEEN 0 AND 6),
        hora_inicio TEXT NOT NULL,
        hora_fin    TEXT NOT NULL,
        activo      INTEGER DEFAULT 1,
        barberia_id INTEGER NOT NULL REFERENCES barberias(id),
        FOREIGN KEY (id_barbero) REFERENCES barberos(id),
        UNIQUE(id_barbero, dia_semana, barberia_id)
    )
`);

// Seed initial schedule if table is empty for this tenant
const horarioCount = db.prepare('SELECT COUNT(*) AS cnt FROM horarios_barberos WHERE barberia_id = 1').get()?.cnt || 0;
if (horarioCount === 0) {
    db.exec(`
        INSERT OR IGNORE INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id)
        VALUES
            (1, 5, '14:00', '21:30', 1, 1),
            (1, 6, '10:00', '21:30', 1, 1),
            (1, 0, '10:30', '19:30', 1, 1),
            (2, 5, '14:00', '21:30', 1, 1),
            (2, 6, '10:00', '21:30', 1, 1),
            (2, 0, '10:30', '19:30', 1, 1)
    `);
    console.log('  Seeded initial horarios_barberos for The Gangsta');
} else {
    console.log('  horarios_barberos already seeded — skipping');
}
console.log('  horarios_barberos table ready');

// ==========================================
// STEP 7: Ensure default categories for all tenants
// ==========================================
console.log('\n--- Step 7: Seeding default categories for all tenants ---');
const barberias = db.prepare('SELECT id FROM barberias').all();
const defaultCategories = ['Venta', 'Herramientas', 'Insumo Limpieza'];

for (const b of barberias) {
    for (const cat of defaultCategories) {
        const exists = db.prepare('SELECT id FROM categorias WHERE nombre = ? AND barberia_id = ?').get(cat, b.id);
        if (!exists) {
            db.prepare('INSERT INTO categorias (nombre, barberia_id) VALUES (?, ?)').run(cat, b.id);
            console.log(`  Added category "${cat}" to barberia #${b.id}`);
        }
    }
}

// ==========================================
// STEP 8: Create temas table
// ==========================================
console.log('\n--- Step 8: Creating temas table ---');

if (!tableExists('temas')) {
    db.exec(`
        CREATE TABLE temas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            bg_main TEXT NOT NULL,
            bg_surface TEXT NOT NULL,
            accent_primary TEXT NOT NULL,
            accent_secondary TEXT,
            text_main TEXT NOT NULL,
            text_muted TEXT,
            clase_glass TEXT
        );
    `);
    console.log('  Created temas table');
} else {
    console.log('  temas table already exists');
}

// ==========================================
// STEP 9: Add tema_id to barberias and seed themes
// ==========================================
console.log('\n--- Step 9: Seeding themes and updating barberias ---');

if (!columnExists('barberias', 'tema_id')) {
    // SQLite doesn't allow adding a REFERENCES column with a DEFAULT value directly on existing tables easily
    // We add it as a simple INTEGER first
    db.exec(`ALTER TABLE barberias ADD COLUMN tema_id INTEGER DEFAULT 1`);
    console.log('  ADDED tema_id (simple) to barberias');
}

// Check if themes exist, if not, seed them
const themeCount = db.prepare('SELECT COUNT(*) AS cnt FROM temas').get().cnt;
if (themeCount === 0) {
    const themes = [
        {
            nombre: 'Naranja Coral',
            bg_main: '#111827', // Gray-900
            bg_surface: '#1F2937', // Gray-800
            accent_primary: '#FF6B4A',
            accent_secondary: '#FF8B71',
            text_main: '#FFFFFF',
            text_muted: '#9CA3AF', // Gray-400
            clase_glass: 'bg-white/10 backdrop-blur-md border border-white/20'
        },
        {
            nombre: 'Retro Clásico',
            bg_main: '#F3F4F6', // Gray-100
            bg_surface: '#FFFFFF',
            accent_primary: '#D64141',
            accent_secondary: '#4A6FA5',
            text_main: '#1F2937',
            text_muted: '#6B7280',
            clase_glass: 'bg-white/70 backdrop-blur-sm border border-gray-200'
        },
        {
            nombre: 'Oro Industrial',
            bg_main: '#090909',
            bg_surface: '#171717',
            accent_primary: '#B59410',
            accent_secondary: '#D4AF37',
            text_main: '#E5E7EB',
            text_muted: '#737373',
            clase_glass: 'bg-black/40 backdrop-blur-lg border border-yellow-900/30'
        },
        {
            nombre: 'Cuero Natural',
            bg_main: '#FAF5E6',
            bg_surface: '#FFFBF0',
            accent_primary: '#78350F',
            accent_secondary: '#92400E',
            text_main: '#4A2C0A',
            text_muted: '#78350F/70',
            clase_glass: 'bg-white/40 backdrop-blur-sm border border-amber-900/10'
        },
        {
            nombre: 'Menta Limpia',
            bg_main: '#FFFFFF',
            bg_surface: '#F9FAFB',
            accent_primary: '#88DBCB',
            accent_secondary: '#66C2B2',
            text_main: '#374151',
            text_muted: '#6B7280',
            clase_glass: 'bg-white/80 backdrop-blur-md border border-emerald-100'
        }
    ];

    const insertTheme = db.prepare(`
        INSERT INTO temas (nombre, bg_main, bg_surface, accent_primary, accent_secondary, text_main, text_muted, clase_glass)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of themes) {
        insertTheme.run(t.nombre, t.bg_main, t.bg_surface, t.accent_primary, t.accent_secondary, t.text_main, t.text_muted, t.clase_glass);
    }
    console.log('  Seeded 5 master themes');
}

db.pragma('foreign_keys = ON');
db.close();

console.log('\n=== Migration complete! ===');
console.log('The Gangsta is now tenant #1');
console.log('SuperAdmin: superadmin@flow.com / admin123');

} // end if(!isNewDB)
