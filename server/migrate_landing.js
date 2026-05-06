import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
        user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
        password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'barberia',
        port: process.env.MYSQLPORT || process.env.DB_PORT || 3306
    });

    try {
        console.log('Agregando columnas de Landing a tabla barberias...');
        await connection.query(`
            ALTER TABLE barberias
            ADD COLUMN landing_titulo VARCHAR(150) DEFAULT 'Bienvenido a nuestra barbería',
            ADD COLUMN landing_descripcion VARCHAR(300) DEFAULT 'Agenda tu cita, acumula puntos y accede a beneficios exclusivos.',
            ADD COLUMN landing_imagen_fondo VARCHAR(500) DEFAULT NULL;
        `);
        console.log('✅ Migración completada exitosamente.');
    } catch (error) {
        if (error.code === 'ER_DUP_COLUMN') {
            console.log('⚠️ Las columnas ya existen. Saltando migración.');
        } else {
            console.error('❌ Error en migración:', error);
        }
    } finally {
        await connection.end();
    }
}

migrate();
