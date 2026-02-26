const Database = require('better-sqlite3');
const db = new Database('./data_seed/barberia.db');

try {
    const rs1 = db.prepare("DELETE FROM citas WHERE fecha = '2026-02-27'").run();
    console.log('Citas borradas para 2026-02-27 (Viernes):', rs1.changes);

    const rs2 = db.prepare("DELETE FROM citas WHERE notas LIKE '%test%'").run();
    console.log('Citas borradas de test general:', rs2.changes);

} catch (e) {
    console.error('Error DB:', e);
}
db.close();
