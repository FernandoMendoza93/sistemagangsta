import express from 'express';
import { verifyToken, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// middleware genérico para todas las rutas de superadmin
router.use(verifyToken, requireSuperAdmin);

// Formatear bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// GET /api/superadmin/database/backup
// Descarga el volcado completo de la DB en formato JSON UTF-8
router.get('/database/backup', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const dbType = req.app.locals.dbType;
        
        let backupData = {};

        if (dbType === 'sqlite') {
            // Extraer dinámicamente todas las tablas saltando las internas
            const tables = await dbQuery.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
            
            for (const tableObj of tables) {
                const tableName = tableObj.name;
                const rows = await dbQuery.all(`SELECT * FROM ${tableName}`);
                backupData[tableName] = rows;
            }
        } else {
            // Lógica para volcado MySQL si es necesario
            const tables = await dbQuery.all("SHOW TABLES");
            for (const tableObj of tables) {
                const tableName = Object.values(tableObj)[0];
                const rows = await dbQuery.all(`SELECT * FROM ${tableName}`);
                backupData[tableName] = rows;
            }
        }

        const jsonString = JSON.stringify(backupData, null, 2);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `flow_database_dump_${timestamp}.json`;

        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/json; charset=utf-8');
        res.send(jsonString);

    } catch (error) {
        console.error('Error generando backup JSON UTF-8 SuperAdmin:', error);
        res.status(500).json({ error: 'Error en el servidor al generar volcado DB' });
    }
});

// GET /api/superadmin/metrics
router.get('/metrics', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        // 1. Memoria RAM de Node
        const memoryUsage = process.memoryUsage();
        const ramUsed = formatBytes(memoryUsage.rss); // Resident Set Size

        // 2. Tamaño de la base de datos MySQL
        let dbSize = 'Desconocido';
        try {
            const sizeResult = await dbQuery.get(`
                SELECT SUM(data_length + index_length) AS total_bytes
                FROM information_schema.TABLES
                WHERE table_schema = DATABASE()
            `, []);
            dbSize = sizeResult && sizeResult.total_bytes ? formatBytes(Number(sizeResult.total_bytes)) : '0 Bytes';
        } catch (e) {
            console.error('Error leyendo tamaño de DB:', e);
        }

        // 3. Barberías Activas para MRR
        const activas = await dbQuery.get(`SELECT SUM(precio_plan) as mrr, COUNT(*) as activas FROM barberias WHERE activo = 1`, []);

        res.json({
            ramUsed,
            dbSize,
            mrr: activas.mrr || 0,
            barberiasActivas: activas.activas || 0
        });
    } catch (error) {
        console.error('Error obteniendo métricas superadmin:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/superadmin/barberias
router.get('/barberias', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        // Obviamos el barberia_id (Engram 002 mitigado para SuperAdmin)
        const barberias = await dbQuery.all(`
            SELECT id, nombre, logo_url, slug, telefono_whatsapp, email_contacto, plan, precio_plan,
                   CASE WHEN activo = 1 THEN 'Activo' ELSE 'Inactivo' END as estado,
                   fecha_vencimiento
            FROM barberias
            ORDER BY created_at DESC
        `, []);

        // Adjuntar un conteo de personal (Barberos + Empleados) general por tenant
        const barberiasConStats = [];
        for (const b of barberias) {
             const statUser = await dbQuery.get(`SELECT count(*) as t FROM usuarios WHERE barberia_id = ?`, [b.id]);
             barberiasConStats.push({
                 ...b,
                 totalUsuarios: statUser.t
             });
        }

        res.json(barberiasConStats);
    } catch (error) {
        console.error('Error listando barberías:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/superadmin/barberias/:id/estado
router.put('/barberias/:id/estado', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { estado } = req.body; // 'Activo' o 'Inactivo'

        if (!['Activo', 'Inactivo'].includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const valorActivo = estado === 'Activo' ? 1 : 0;

        const result = await dbQuery.run(`
            UPDATE barberias SET activo = ? WHERE id = ?
        `, [valorActivo, id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Barbería no encontrada' });
        }

        res.json({ message: 'Estado actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando estado barbería:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/superadmin/alertas/verificar
router.get('/alertas/verificar', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        
        // 1. Obtener todas las barberías activas
        const barberias = await dbQuery.all(`
            SELECT id, nombre, plan, fecha_vencimiento, alerta_enviada
            FROM barberias 
            WHERE activo = 1
        `, []);

        const hoy = new Date();
        const proximas = [];
        const vencidas = [];

        for (const barberia of barberias) {
            const vencimiento = new Date(barberia.fecha_vencimiento);
            const diffTime = vencimiento - hoy;
            const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Alerta 7 días antes
            if (diasRestantes <= 7 && diasRestantes > 0 && !barberia.alerta_enviada) {
                await dbQuery.run(`
                    INSERT INTO notificaciones 
                    (barberia_id, mensaje, tipo, leido)
                    VALUES (?, ?, 'vencimiento_proximo', 0)
                `, [
                    barberia.id,
                    `Tu suscripción vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}. Realiza tu pago para continuar sin interrupciones.`
                ]);

                await dbQuery.run(
                    'UPDATE barberias SET alerta_enviada = 1 WHERE id = ?',
                    [barberia.id]
                );
            }

            // Alerta si ya venció
            if (diasRestantes <= 0) {
                // Evitar duplicar notificaciones de vencimiento no leídas
                const existe = await dbQuery.get(`
                    SELECT id FROM notificaciones 
                    WHERE barberia_id = ? AND tipo = 'suscripcion_vencida' AND leido = 0
                `, [barberia.id]);

                if (!existe) {
                    await dbQuery.run(`
                        INSERT INTO notificaciones 
                        (barberia_id, mensaje, tipo, leido)
                        VALUES (?, ?, 'suscripcion_vencida', 0)
                    `, [
                        barberia.id,
                        `Tu suscripción ha vencido. Contacta a soporte para reactivar tu cuenta.`
                    ]);
                }
            }

            if (diasRestantes <= 7 && diasRestantes > 0) {
                proximas.push(barberia);
            } else if (diasRestantes <= 0) {
                vencidas.push(barberia);
            }
        }

        res.json({
            total: barberias.length,
            proximas_a_vencer: proximas,
            vencidas: vencidas
        });

    } catch (error) {
        console.error('Error verificando alertas superadmin:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/superadmin/barberias/:id/renovar
router.put('/barberias/:id/renovar', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { meses } = req.body;

        if (!meses || isNaN(meses)) {
            return res.status(400).json({ error: 'Número de meses inválido' });
        }

        const barberia = await dbQuery.get('SELECT fecha_vencimiento FROM barberias WHERE id = ?', [id]);
        if (!barberia) {
            return res.status(404).json({ error: 'Barbería no encontrada' });
        }

        // Calcular nueva fecha desde hoy o desde vencimiento actual (lo que sea mayor)
        const base = new Date(Math.max(new Date(), new Date(barberia.fecha_vencimiento)));
        base.setMonth(base.getMonth() + parseInt(meses));
        
        // Formatear para MySQL (YYYY-MM-DD HH:mm:ss)
        const baseStr = base.toISOString().slice(0, 19).replace('T', ' ');

        await dbQuery.run(`
            UPDATE barberias 
            SET fecha_vencimiento = ?,
                alerta_enviada = 0
            WHERE id = ?
        `, [baseStr, id]);

        res.json({ message: 'Suscripción renovada exitosamente', nueva_fecha: baseStr });

    } catch (error) {
        console.error('Error renovando barbería:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
