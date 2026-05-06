import mysql from 'mysql2/promise';
import 'dotenv/config';

async function checkDates() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'mendoza14',
        database: process.env.DB_NAME || 'barberia',
        port: process.env.DB_PORT || 3306
    });

    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tablas encontradas:', tables);

    // Intentamos buscar en 'barberia_ventas' o 'citas' que son nombres comunes en tu proyecto
    console.log('--- Comparación UTC vs México (Últimas 10 Ventas) ---');
    const [rows] = await connection.query(`
        SELECT id, fecha, 
        DATE(fecha) as fecha_utc,
        DATE(CONVERT_TZ(fecha, '+00:00', '-05:00')) as fecha_mexico
        FROM ventas_cabecera 
        ORDER BY id DESC 
        LIMIT 10;
    `);

    console.table(rows);
    await connection.end();
}

checkDates();
