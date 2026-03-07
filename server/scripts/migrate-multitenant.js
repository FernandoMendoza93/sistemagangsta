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

if (!existsSync(dbPath)) {
    console.error('Database not found at', dbPath);
    process.exit(1);
}

// Backup
const backupPath = dbPath.replace('.db', `.backup-${Date.now()}.db`);
copyFileSync(dbPath, backupPath);
console.log(`Backup created: ${backupPath}`);

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
db.close();

console.log('\n=== Migration complete! ===');
console.log('The Gangsta is now tenant #1');
console.log('SuperAdmin: superadmin@flow.com / admin123');
