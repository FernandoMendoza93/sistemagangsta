const Database = require('better-sqlite3');

const db = new Database('./server/data_seed/barberia.db');

// Delete appointments for upcoming Fridays (assume 2026-02-27 and 2026-03-06 based on current context)
const result = db.prepare(`DELETE FROM citas WHERE fecha = '2026-02-27'`).run();
console.log(`Deleted ${result.changes} appointments for 2026-02-27`);

const result2 = db.prepare(`DELETE FROM citas WHERE fecha = '2026-03-06'`).run();
console.log(`Deleted ${result2.changes} appointments for 2026-03-06`);

db.close();
