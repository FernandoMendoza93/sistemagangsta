import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Mexico_City");

// Recrear __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function applyManualStamps() {
    console.log('[MANUAL_UPDATE] Iniciando inyección de sellos de rescate ESM...');

    // 🏛️ INFRAESTRUCTURA INMUTABLE: Respetar ruta dinámica de Railway
    const dbPath = process.env.DATABASE_URL || join(__dirname, '..', 'data', 'database.sqlite');

    let db;
    try {
        db = new Database(dbPath);

        // Target: Clientes bloqueados ayer/hoy.
        const targets = ['Zaira Jarquín', 'Ángel de Jesús', 'José Luis Rodríguez'];
        // Fecha estricta en zona horaria obligatoria
        const hoy = dayjs().tz("America/Mexico_City").format('YYYY-MM-DD');
        const barberia_id_target = 1;

        for (const nombre of targets) {
            // 🔍 Auto-Validación (Engram 002): Buscar asegurando el barberia_id
            const cliente = db.prepare(`SELECT id, nombre FROM clientes WHERE nombre LIKE ? AND barberia_id = ?`).get(`%${nombre}%`, barberia_id_target);

            if (cliente) {
                // Verificar si ya se inyectó el sello hoy (Seguro de Auto-destrucción)
                const selloExistente = db.prepare(`
                    SELECT id FROM visitas_lealtad 
                    WHERE id_cliente = ? AND fecha = ? AND barberia_id = ?
                `).get(cliente.id, hoy, barberia_id_target);

                if (selloExistente) {
                    console.log(`[SKIP] Sello de rescate ya aplicado hoy para ${cliente.nombre} (ID: ${cliente.id}). Ignorando.`);
                } else {
                    // Inyectar sello
                    db.prepare(`
                        INSERT INTO visitas_lealtad (id_cliente, fecha, barberia_id)
                        VALUES (?, ?, ?)
                    `).run(cliente.id, hoy, barberia_id_target);
                    console.log(`[EXITO] Sello de rescate inyectado para ${cliente.nombre} (ID: ${cliente.id}).`);
                }
            } else {
                console.log(`[ERROR_TARGET] No se encontró cliente coincidente con: ${nombre}.`);
            }
        }

        console.log('[MANUAL_UPDATE] Proceso de sellos de rescate ESM finalizado.');

    } catch (error) {
        console.error('[MANUAL_UPDATE_ERROR] Fallo al ejecutar el script de rescate ESM:', error.message);
    } finally {
        if (db) db.close();
    }
}
