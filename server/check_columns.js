import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQLHOST,
        user: process.env.MYSQLUSER,
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE,
        port: process.env.MYSQLPORT
    });

    const [rows] = await connection.execute('DESCRIBE cortes_caja');
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
}

check().catch(console.error);
