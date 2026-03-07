const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, 'data', 'database.sqlite'));

console.log('Creando tabla visitas_lealtad...');

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS visitas_lealtad (
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

    // Check columns
    const info = db.pragma('table_info(visitas_lealtad)');
    console.log('Columnas visitas_lealtad:', info.map(c => c.name).join(', '));
    console.log('✅ Tabla creada exitosamente en database.sqlite');
} catch (error) {
    console.error('❌ Error creando tabla:', error.message);
}
