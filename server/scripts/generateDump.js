import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const outPath = path.join(__dirname, '..', 'data_seed', 'init_data.sql');

console.log(`Abriendo base de datos local en: ${dbPath}`);
const db = new Database(dbPath, { readonly: true });

const tablesToDump = [
    'roles',
    'usuarios',
    'barberos',
    'categorias',
    'productos',
    'servicios',
    'clientes',
    // Optionally citas or ventas, but let's stick to core master data as requested
    'citas',
    'ventas_cabecera',
    'ventas_detalle',
    'cortes_caja',
    'entradas_efectivo',
    'gastos',
    'comisiones_pendientes',
    'comisiones_pagadas',
    'loyalty_tokens'
];

let sqlDump = '-- ==========================================\n';
sqlDump += '-- Auto-generado SQL Dump para Railway Seed\n';
sqlDump += `-- Fecha: ${new Date().toISOString()}\n`;
sqlDump += '-- ==========================================\n\n';

for (const table of tablesToDump) {
    try {
        const rows = db.prepare(`SELECT * FROM ${table}`).all();
        if (rows.length === 0) continue;

        sqlDump += `-- Tabla: ${table} (${rows.length} registros)\n`;

        for (const row of rows) {
            const columns = Object.keys(row);
            const values = Object.values(row).map(val => {
                if (val === null) return 'NULL';
                if (typeof val === 'string') {
                    // Escapar comillas simples
                    return `'${val.replace(/'/g, "''")}'`;
                }
                return val;
            });

            sqlDump += `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sqlDump += '\n';
    } catch (error) {
        console.warn(`⚠️ Tabla ${table} no existe o error: ${error.message}`);
    }
}

db.close();

// Guardar archivo
if (!fs.existsSync(path.dirname(outPath))) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
}

fs.writeFileSync(outPath, sqlDump, 'utf-8');
console.log(`✅ Dump generado exitosamente en: ${outPath}`);
