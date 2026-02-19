import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../database.sqlite'));

console.log('🔧 Agregando tablas faltantes...');

try {
    // Crear tabla gastos
    db.exec(`
        CREATE TABLE IF NOT EXISTS gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monto REAL NOT NULL,
            descripcion TEXT NOT NULL,
            fecha TEXT DEFAULT (datetime('now', 'localtime')),
            id_usuario INTEGER NOT NULL,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        )
    `);
    console.log('✅ Tabla gastos creada');

    // Crear tabla entradas_efectivo
    db.exec(`
        CREATE TABLE IF NOT EXISTS entradas_efectivo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monto REAL NOT NULL,
            descripcion TEXT NOT NULL,
            fecha TEXT DEFAULT (datetime('now', 'localtime')),
            id_usuario INTEGER NOT NULL,
            id_corte INTEGER,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
            FOREIGN KEY (id_corte) REFERENCES cortes_caja(id)
        )
    `);
    console.log('✅ Tabla entradas_efectivo creada');

    console.log('🎉 ¡Tablas agregadas exitosamente!');
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

db.close();
