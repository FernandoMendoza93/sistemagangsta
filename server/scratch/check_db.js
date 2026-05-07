import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkTable() {
    const pool = mysql.createPool({
        host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
        user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
        password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'barberia',
        port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
    });

    try {
        const [rows] = await pool.query('DESCRIBE barberias');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkTable();
