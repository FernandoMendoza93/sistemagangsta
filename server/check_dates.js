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
    console.log('--- Analizando COMISIONES_PENDIENTES ---');
    const [comisiones] = await connection.query(`
        SELECT id, fecha, DATE(CONVERT_TZ(fecha, '+00:00', '-06:00')) as fecha_mexico 
        FROM comisiones_pendientes 
        WHERE DATE(fecha) IN ('2026-05-05', '2026-05-06')
        ORDER BY fecha;
    `);
    console.table(comisiones);

    console.log('--- Analizando VENTAS_CABECERA ---');
    const [ventas] = await connection.query(`
        SELECT id, fecha, DATE(CONVERT_TZ(fecha, '+00:00', '-06:00')) as fecha_mexico 
        FROM ventas_cabecera 
        WHERE DATE(fecha) IN ('2026-05-05', '2026-05-06')
        ORDER BY fecha;
    `);
    console.table(ventas);

    await connection.end();
}

checkDates();
