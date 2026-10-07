import 'dotenv/config';
import mysql from 'mysql2/promise';

async function runMigration() {
    console.log('Iniciando migración Fase 2...');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'barberia',
            port: process.env.DB_PORT || 3306
        });

        console.log('Conectado a la BD.');

        // 1. ALTER TABLE clientes
        try {
            await connection.query(`ALTER TABLE clientes ADD COLUMN email VARCHAR(255) NULL, ADD COLUMN password_changed_at DATETIME NULL, ADD UNIQUE KEY uq_cliente_barberia_email (barberia_id, email)`);
            console.log('✅ Tabla clientes modificada exitosamente.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME') {
                console.log('⚠️ Las columnas/índices en clientes ya existen. Omitiendo.');
            } else {
                throw e;
            }
        }

        // 2. ALTER TABLE usuarios
        try {
            await connection.query(`ALTER TABLE usuarios ADD COLUMN password_changed_at DATETIME NULL`);
            console.log('✅ Tabla usuarios modificada exitosamente.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ La columna en usuarios ya existe. Omitiendo.');
            } else {
                throw e;
            }
        }

        // 3. CREATE TABLE password_resets
        await connection.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                 id INT AUTO_INCREMENT PRIMARY KEY,
                 owner_id INT NOT NULL,
                 tipo ENUM('usuario','cliente') NOT NULL,
                 barberia_id INT NULL,
                 token_hash CHAR(64) NOT NULL,
                 expira_en DATETIME NOT NULL,
                 usado TINYINT(1) DEFAULT 0,
                 creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                 INDEX idx_token_hash (token_hash),
                 INDEX idx_owner (tipo, owner_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabla password_resets verificada/creada exitosamente.');

        await connection.end();
        console.log('Migración completada.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
        process.exit(1);
    }
}

runMigration();
