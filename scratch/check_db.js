const mysql = require('mysql2/promise');

async function checkTable() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'mendoza 14',
            database: 'barberia'
        });

        const [rows] = await connection.query('DESCRIBE barberias;');
        console.log(JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkTable();
