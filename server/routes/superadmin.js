import express from 'express';
import { verifyToken, requireSuperAdmin } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';

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

// GET /api/superadmin/metrics
router.get('/metrics', async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        // 1. Memoria RAM de Node
        const memoryUsage = process.memoryUsage();
        const ramUsed = formatBytes(memoryUsage.rss); // Resident Set Size

        // 2. Tamaño del archivo SQLite
        const dbPath = path.resolve('data', 'database.sqlite');
        let dbSize = 'Desconocido';
        try {
            if (fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath);
                dbSize = formatBytes(stats.size);
            }
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

export default router;
