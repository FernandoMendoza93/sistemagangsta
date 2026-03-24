import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Obtener el nombre del archivo JSON de los argumentos de la consola (ej: node import.js backup.json)
const backupFilename = process.argv[2];

if (!backupFilename) {
    console.error('❌ Error: Debes proporcionar el nombre del archivo de backup JSON.');
    console.error('👉 Uso: node scripts/import-backup-to-mysql.js flow_database_dump_xxx.json');
    process.exit(1);
}

const backupPath = path.resolve(process.cwd(), backupFilename);

if (!fs.existsSync(backupPath)) {
    console.error(`❌ Error: El archivo ${backupPath} no existe.`);
    process.exit(1);
}

/**
 * Script de Inyección JSON (SQLite) a MySQL
 * -----------------------------------------
 * Lee el archivo JSON generado por el entorno de producción
 * y escupe los registros exactos a la base de MySQL local.
 */
async function runImport() {
    console.log(`\n📦 Leyendo backup desde: ${backupFilename}...`);
    const backupRaw = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupRaw);

    console.log('🔗 Conectando a MySQL...');
    // Asegúrate de que tu .env o tu entorno tenga estas variables configuradas
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'barberia', // Ajusta si tu DB se llama diferente
        port: process.env.DB_PORT || 3306,
        multipleStatements: true // Necesario para algunas transacciones masivas
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión establecida con MySQL.');

        // Desactivar restricción de llaves foráneas para importar sin importar el orden exacto de las dependencias
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        console.log('🔓 Restricciones de Claves Foráneas desactivadas temporalmente.');

        // Iterar sobre cada tabla en el JSON
        const tables = Object.keys(backupData);
        for (const table of tables) {
            // Omitir tablas internas de SQLite
            if (table.startsWith('sqlite_')) continue;

            const rows = backupData[table];
            if (!rows || rows.length === 0) {
                console.log(`  ⏩ Tabla ${table} omitida (Cero registros).`);
                continue;
            }

            console.log(`  📌 Insertando ${rows.length} registros en la tabla [${table}]...`);

            // Para prevenir duplicados, vaciamos la tabla de MySQL antes de inyectar la producción
            await connection.query(`TRUNCATE TABLE ${table}`);

            // Extraer las columnas de la primera fila
            const columns = Object.keys(rows[0]);
            
            // Construir la consulta INSERT dinámica
            const colString = columns.map(c => `\`${c}\``).join(', ');
            const placeholders = columns.map(() => '?').join(', ');
            const query = `INSERT INTO \`${table}\` (${colString}) VALUES (${placeholders})`;

            // Ejecutar la inyección fila por fila (o en batch)
            let successCount = 0;
            for (const row of rows) {
                // Convertir undefined a null para MySQL
                const values = columns.map(col => row[col] !== undefined ? row[col] : null);
                
                try {
                    await connection.execute(query, values);
                    successCount++;
                } catch (err) {
                    console.error(`    ❌ Error insertando fila ID ${row.id || '?'} en ${table}:`, err.message);
                }
            }
            
            console.log(`    ✅ Completado: ${successCount}/${rows.length} en [${table}].`);
        }

        // Reactivar restricciones FK
        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        console.log('\n🔒 Restricciones de Claves Foráneas reactivadas.');

        console.log('🚀 ¡MIGRACIÓN A MYSQL COMPLETADA CON ÉXITO! 🚀');

    } catch (error) {
        console.error('❌ Error fatal en la migración:', error.message);
        if (connection) {
            try {
                await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
            } catch (e) {}
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('👋 Conexión a MySQL cerrada.');
        }
    }
}

runImport();
