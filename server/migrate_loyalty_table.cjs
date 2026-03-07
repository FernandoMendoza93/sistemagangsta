const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
console.log('Migrating DB at:', dbPath);

try {
    const db = new Database(dbPath);

    // Drop the deprecated table
    db.prepare('DROP TABLE IF EXISTS loyalty_tokens').run();

    console.log('✅ Success: loyalty_tokens table dropped.');

    // Just to verify, list tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Current tables:', tables.map(t => t.name).join(', '));

    db.close();
} catch (error) {
    console.error('Migration failed:', error);
}
