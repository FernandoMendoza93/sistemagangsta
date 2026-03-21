/**
 * Flow SaaS - Multi-Tenant Migration Script
 * Adds barberias table and barberia_id to all existing tables.
 * Safe to run multiple times (idempotent).
 * Includes fast-check to skip entirely when already migrated.
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

const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');

// === FAST CHECK: Skip migration entirely if everything is already done ===
function isAlreadyMigrated() {
    try {
        const hasBarberias = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='barberias'").get();
        if (!hasBarberias) return false;
        const hasTenant = db.prepare('SELECT id FROM barberias WHERE id = 1').get();
        if (!hasTenant) return false;
        const cols = db.prepare("PRAGMA table_info(usuarios)").all();
        if (!cols.some(c => c.name === 'barberia_id')) return false;
        const saRole = db.prepare("SELECT id FROM roles WHERE nombre_rol = 'SuperAdmin'").get();
        if (!saRole) return false;
        const saUser = db.prepare("SELECT id FROM usuarios WHERE email = 'superadmin@flow.com'").get();
        if (!saUser) return false;
        const hasTheme = db.prepare("PRAGMA table_info(barberias)").all().some(c => c.name === 'theme');
        if (!hasTheme) return false;
        const hasVisitas = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='visitas_lealtad'").get();
        if (!hasVisitas) return false;
        return true;
    } catch { return false; }
}

function runMigration() {
    // Create backup only when migration actually needs to run
    const backupPath = dbPath.replace('.sqlite', `_backup_${Date.now()}.sqlite`);
    copyFileSync(dbPath, backupPath);
    console.log(`Backup created: ${backupPath}`);

    function columnExists(table, column) {
        const cols = db.prepare(`PRAGMA table_info(${table})`).all();
        return cols.some(c => c.name === column);
    }

    function tableExists(table) {
        const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
        return !!row;
    }

    // STEP 1: Create barberias table
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

    if (!columnExists('barberias', 'theme')) {
        db.exec(`ALTER TABLE barberias ADD COLUMN theme TEXT DEFAULT 'default'`);
        console.log('  ADDED theme to barberias');
    }
    if (!columnExists('barberias', 'loyalty_card_image_url')) {
        db.exec(`ALTER TABLE barberias ADD COLUMN loyalty_card_image_url TEXT`);
        console.log('  ADDED loyalty_card_image_url to barberias');
    }

    // STEP 2: Seed The Gangsta as first tenant
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

    // STEP 3: Add barberia_id to all tables
    console.log('\n--- Step 3: Adding barberia_id to tables ---');
    const tablesToMigrate = [
        'usuarios', 'barberos', 'servicios', 'clientes', 'citas',
        'ventas_cabecera', 'ventas_detalle', 'categorias', 'productos',
        'movimientos_inventario', 'cortes_caja', 'gastos', 'entradas_efectivo',
        'comisiones_pendientes', 'comisiones_pagadas',
    ];

    for (const table of tablesToMigrate) {
        if (!tableExists(table)) { continue; }
        if (columnExists(table, 'barberia_id')) { continue; }
        db.exec(`ALTER TABLE ${table} ADD COLUMN barberia_id INTEGER DEFAULT 1 REFERENCES barberias(id)`);
        console.log(`  ADDED barberia_id to ${table}`);
    }

    if (!columnExists('clientes', 'password_hash')) {
        db.exec(`ALTER TABLE clientes ADD COLUMN password_hash TEXT`);
        console.log(`  ADDED password_hash to clientes`);
    }

    if (tableExists('loyalty_tokens') && !columnExists('loyalty_tokens', 'barberia_id')) {
        db.exec(`ALTER TABLE loyalty_tokens ADD COLUMN barberia_id INTEGER DEFAULT 1 REFERENCES barberias(id)`);
        console.log('  ADDED barberia_id to loyalty_tokens');
    }

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
        console.log('  Created visitas_lealtad table');
    } else if (!columnExists('visitas_lealtad', 'barberia_id')) {
        db.exec(`ALTER TABLE visitas_lealtad ADD COLUMN barberia_id INTEGER DEFAULT 1 REFERENCES barberias(id)`);
        console.log('  ADDED barberia_id to visitas_lealtad');
    }

    // STEP 4: Add SuperAdmin role
    console.log('\n--- Step 4: Adding SuperAdmin role ---');
    const saRole = db.prepare('SELECT id FROM roles WHERE nombre_rol = ?').get('SuperAdmin');
    if (!saRole) {
        db.prepare('INSERT INTO roles (id, nombre_rol) VALUES (4, ?)').run('SuperAdmin');
        console.log('  Created SuperAdmin role (id=4)');
    } else {
        console.log('  SuperAdmin role already exists');
    }

    // STEP 5: Create SuperAdmin user
    console.log('\n--- Step 5: Creating SuperAdmin user ---');
    const saUser = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('superadmin@flow.com');
    if (!saUser) {
        db.prepare(`
            INSERT INTO usuarios (nombre, email, password_hash, id_rol, activo, barberia_id)
            VALUES ('Fernando Mendoza', 'superadmin@flow.com', '$2a$10$LSqZn7RarDawowdFon0BKOv2klo6Y13HCwU8Wf8INmVFFwSDdaSJi', 4, 1, NULL)
        `).run();
        console.log('  Created SuperAdmin user: superadmin@flow.com / admin123');
    } else {
        console.log('  SuperAdmin user already exists');
    }

    // STEP 6: Create indexes
    console.log('\n--- Step 6: Creating indexes ---');
    const indexedTables = ['usuarios', 'clientes', 'citas', 'ventas_cabecera', 'servicios', 'productos'];
    for (const table of indexedTables) {
        if (tableExists(table) && columnExists(table, 'barberia_id')) {
            try {
                db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_barberia ON ${table}(barberia_id)`);
                console.log(`  Created index on ${table}.barberia_id`);
            } catch (e) {
                // index already exists
            }
        }
    }

    console.log('\n=== Migration complete! ===');
    console.log('The Gangsta is now tenant #1');
    console.log('SuperAdmin: superadmin@flow.com / admin123');
}

// --- Entry point ---
if (isAlreadyMigrated()) {
    console.log('✅ Multi-tenant migration: already up to date (skipped)');
} else {
    runMigration();
}

db.pragma('foreign_keys = ON');
db.close();
