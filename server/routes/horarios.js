import express from 'express';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/horarios/:id_barbero — Horario semanal de un barbero
router.get('/:id_barbero', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id_barbero } = req.params;

        // Verificar que el barbero pertenece al tenant
        const barbero = db.prepare(`
            SELECT b.id, u.nombre FROM barberos b
            JOIN usuarios u ON b.id_usuario = u.id
            WHERE b.id = ? AND b.barberia_id = ?
        `).get(id_barbero, req.barberia_id);

        if (!barbero) {
            return res.status(404).json({ error: 'Barbero no encontrado' });
        }

        const horarios = db.prepare(`
            SELECT dia_semana, hora_inicio, hora_fin, activo
            FROM horarios_barberos
            WHERE id_barbero = ? AND barberia_id = ?
            ORDER BY dia_semana ASC
        `).all(id_barbero, req.barberia_id);

        res.json({ barbero, horarios });
    } catch (error) {
        console.error('Error obteniendo horarios:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/horarios — Horarios de TODOS los barberos activos del tenant
router.get('/', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;

        const barberos = db.prepare(`
            SELECT b.id, u.nombre, b.estado
            FROM barberos b
            JOIN usuarios u ON b.id_usuario = u.id
            WHERE b.barberia_id = ? AND b.estado = 'Activo'
            ORDER BY u.nombre ASC
        `).all(req.barberia_id);

        const resultado = barberos.map(barbero => {
            const horarios = db.prepare(`
                SELECT dia_semana, hora_inicio, hora_fin, activo
                FROM horarios_barberos
                WHERE id_barbero = ? AND barberia_id = ?
                ORDER BY dia_semana ASC
            `).all(barbero.id, req.barberia_id);
            return { ...barbero, horarios };
        });

        res.json(resultado);
    } catch (error) {
        console.error('Error obteniendo horarios:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/horarios/:id_barbero/batch — Actualización masiva de horarios
router.put('/:id_barbero/batch', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id_barbero } = req.params;
        const { horarios } = req.body; // Array de { dia_semana, hora_inicio, hora_fin, activo }

        if (!Array.isArray(horarios)) {
            return res.status(400).json({ error: 'Formato inválido. Se esperaba un array de horarios.' });
        }

        // Verificar barbero del tenant
        const barbero = db.prepare('SELECT id FROM barberos WHERE id = ? AND barberia_id = ?').get(id_barbero, req.barberia_id);
        if (!barbero) return res.status(404).json({ error: 'Barbero no encontrado' });

        const actualizarBatch = db.transaction((horariosArray) => {
            const stmt = db.prepare(`
                INSERT INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id_barbero, dia_semana, barberia_id) DO UPDATE SET
                    hora_inicio = excluded.hora_inicio,
                    hora_fin    = excluded.hora_fin,
                    activo      = excluded.activo
            `);

            for (const h of horariosArray) {
                const diaNum = parseInt(h.dia_semana);
                if (isNaN(diaNum) || diaNum < 0 || diaNum > 6) continue;

                if (h.activo && (!h.hora_inicio || !h.hora_fin)) {
                    throw new Error(`Las horas son requeridas para el día ${diaNum} si está activo`);
                }

                stmt.run(
                    id_barbero,
                    diaNum,
                    h.hora_inicio || '10:00',
                    h.hora_fin || '20:00',
                    h.activo ? 1 : 0,
                    req.barberia_id
                );
            }
        });

        actualizarBatch(horarios);
        console.log(`✅ Lote de horarios guardado atómicamente: barbero #${id_barbero}`);
        res.json({ message: 'Horarios actualizados en lote correctamente' });
    } catch (error) {
        console.error('Error actualizando horarios batch:', error);
        res.status(400).json({ error: error.message || 'Error en el servidor al guardar el lote' });
    }
});

// PUT /api/horarios/:id_barbero/:dia — Crear o actualizar el turno de un día específico
// dia: 0-6 (0=Dom, 6=Sáb)
router.put('/:id_barbero/:dia', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id_barbero, dia } = req.params;
        const { hora_inicio, hora_fin, activo = 1 } = req.body;

        const diaNum = parseInt(dia);
        if (isNaN(diaNum) || diaNum < 0 || diaNum > 6) {
            return res.status(400).json({ error: 'Día inválido (debe ser 0-6)' });
        }

        // Verificar barbero del tenant
        const barbero = db.prepare('SELECT id FROM barberos WHERE id = ? AND barberia_id = ?').get(id_barbero, req.barberia_id);
        if (!barbero) return res.status(404).json({ error: 'Barbero no encontrado' });

        if (activo && (!hora_inicio || !hora_fin)) {
            return res.status(400).json({ error: 'hora_inicio y hora_fin son requeridas cuando el turno está activo' });
        }

        // UPSERT: INSERT OR REPLACE
        db.prepare(`
            INSERT INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id_barbero, dia_semana, barberia_id) DO UPDATE SET
                hora_inicio = excluded.hora_inicio,
                hora_fin    = excluded.hora_fin,
                activo      = excluded.activo
        `).run(id_barbero, diaNum, hora_inicio || '10:00', hora_fin || '20:00', activo ? 1 : 0, req.barberia_id);

        console.log(`✅ Horario actualizado: barbero #${id_barbero} día ${diaNum} → ${hora_inicio}-${hora_fin} activo=${activo}`);
        res.json({ message: 'Horario actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando horario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
