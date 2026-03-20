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
router.get('/metrics', (req, res) => {
    try {
        const db = req.app.locals.db;

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
        const activas = db.prepare(`SELECT SUM(precio_plan) as mrr, COUNT(*) as activas FROM barberias WHERE activo = 1`).get();

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
router.get('/barberias', (req, res) => {
    try {
        const db = req.app.locals.db;
        // Obviamos el barberia_id (Engram 002 mitigado para SuperAdmin)
        const barberias = db.prepare(`
            SELECT id, nombre, logo_url, slug, telefono_whatsapp, email_contacto, plan, precio_plan, 
                   CASE WHEN activo = 1 THEN 'Activo' ELSE 'Inactivo' END as estado, 
                   fecha_vencimiento
            FROM barberias
            ORDER BY created_at DESC
        `).all();
        
        // Adjuntar un conteo de personal (Barberos + Empleados) general por tenant
        const barberiasConStats = barberias.map(b => {
             const statUser = db.prepare(`SELECT count(*) as t FROM usuarios WHERE barberia_id = ?`).get(b.id);
             return {
                 ...b,
                 totalUsuarios: statUser.t
             }
        });

        res.json(barberiasConStats);
    } catch (error) {
        console.error('Error listando barberías:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/superadmin/barberias/:id/estado
router.put('/barberias/:id/estado', (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { estado } = req.body; // 'Activo' o 'Inactivo'

        if (!['Activo', 'Inactivo'].includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const valorActivo = estado === 'Activo' ? 1 : 0;

        const result = db.prepare(`
            UPDATE barberias SET activo = ? WHERE id = ?
        `).run(valorActivo, id);

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
