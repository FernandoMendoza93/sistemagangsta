const db = require('./node_modules/better-sqlite3')('./data/database.sqlite');
const result = db.prepare("UPDATE ventas_cabecera SET estado = 'completada' WHERE estado = 'pendiente'").run();
console.log('Fixed stuck pending rows:', result.changes);
