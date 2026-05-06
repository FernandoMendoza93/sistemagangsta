import express from 'express';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';

const router = express.Router();

// Función auxiliar para recalcular todos los clientes
async function recalcularClientes(dbQuery, barberia_id) {
    // Obtener todos los niveles
    const niveles = await dbQuery.all(`
        SELECT id_rol_lealtad, dias_max_frecuencia 
        FROM barberia_lealtad_niveles 
        WHERE barberia_id = ?
        ORDER BY dias_max_frecuencia ASC
    `, [barberia_id]);

    // Obtener clientes activos con ultima_visita
    const clientes = await dbQuery.all(`
        SELECT id, ultima_visita, id_rol_lealtad 
        FROM clientes 
        WHERE activo = 1 AND barberia_id = ? AND ultima_visita IS NOT NULL
    `, [barberia_id]);

    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    let afectados = 0;

    for (const c of clientes) {
        const last = new Date(c.ultima_visita);
        last.setHours(0,0,0,0);
        const diffDias = Math.floor((hoy - last) / (1000 * 60 * 60 * 24));
        
        let nuevoRol = null; // Default: si no califica para ningún nivel (por ejemplo, pasaron 100 días y el maximo es 60, cae a null/Bronce. Espera, el Base debe atraparlos a todos).
        // Si el nivel tiene la mayor frecuencia (ej. Bronce = 1000 dias o simplemente es el fallback)
        // Para simplificar: el nivel que tenga `dias_max_frecuencia >= diffDias`, el MÁS cercano a 0 (menor frecuencia) es el rango más alto.
        // Ej: Oro=15, Plata=30, Bronce=999. Si visitó hace 20 días -> no entra a Oro, entra a Plata.
        for (const n of niveles) {
            if (diffDias <= n.dias_max_frecuencia) {
                nuevoRol = n.id_rol_lealtad;
                break; // Because they are sorted ASC by dias (i.e. Oro(15) is evaluated before Plata(30))
            }
        }

        // Si pasó demasiado tiempo, le asignamos el nivel de mayor tolerancia (el último del array ASC)
        if (!nuevoRol && niveles.length > 0) {
            nuevoRol = niveles[niveles.length - 1].id_rol_lealtad;
        }

        if (nuevoRol !== c.id_rol_lealtad) {
            await dbQuery.run('UPDATE clientes SET id_rol_lealtad = ? WHERE id = ?', [nuevoRol, c.id]);
            afectados++;
        }
    }
    return afectados;
}

// GET /api/lealtad/niveles - Obtener todos los niveles configurados
router.get('/niveles', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        let niveles = await dbQuery.all(`
            SELECT id_rol_lealtad, barberia_id, nombre_nivel, dias_max_frecuencia, beneficio_id, porcentaje_descuento, premio_descripcion, color_hex, created_at
            FROM barberia_lealtad_niveles 
            WHERE barberia_id = ?
            ORDER BY dias_max_frecuencia ASC
        `, [req.barberia_id]);

        if (niveles.length === 0) {
            // Seed defaults for new tenants
            await dbQuery.run(`
                INSERT INTO barberia_lealtad_niveles (barberia_id, nombre_nivel, dias_max_frecuencia, porcentaje_descuento, premio_descripcion, color_hex)
                VALUES (?, 'Bronce (Base)', 999, 0, '1 Corte Gratis al acumular 10 sellos', '#e2725b')
            `, [req.barberia_id]);
            
            niveles = await dbQuery.all(`
                SELECT id_rol_lealtad, barberia_id, nombre_nivel, dias_max_frecuencia, beneficio_id, porcentaje_descuento, premio_descripcion, color_hex, created_at
                FROM barberia_lealtad_niveles 
                WHERE barberia_id = ?
                ORDER BY dias_max_frecuencia ASC
            `, [req.barberia_id]);
        }

        // Contar el número actual de clientes por cada nivel
        const stats = await dbQuery.all(`
             SELECT id_rol_lealtad, COUNT(*) as qty 
             FROM clientes 
             WHERE activo = 1 AND barberia_id = ? AND id_rol_lealtad IS NOT NULL
             GROUP BY id_rol_lealtad
        `, [req.barberia_id]);

        const statsMap = {};
        stats.forEach(s => { statsMap[s.id_rol_lealtad] = s.qty; });

        const enriched = niveles.map(n => ({
            ...n,
            clientes_activos: statsMap[n.id_rol_lealtad] || 0
        }));

        res.json(enriched);
    } catch (error) {
        console.error('Error listando niveles de lealtad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/lealtad/niveles - Crear un nuevo nivel de lealtad
router.post('/niveles', verifyToken, requireTenant, requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { nombre_nivel, dias_max_frecuencia, porcentaje_descuento, premio_descripcion, color_hex } = req.body;

        if (!nombre_nivel || !dias_max_frecuencia) {
            return res.status(400).json({ error: 'Nombre de nivel y días máximos son requeridos' });
        }

        const result = await dbQuery.run(`
            INSERT INTO barberia_lealtad_niveles (barberia_id, nombre_nivel, dias_max_frecuencia, porcentaje_descuento, premio_descripcion, color_hex)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.barberia_id, nombre_nivel, dias_max_frecuencia, porcentaje_descuento || 0.00, premio_descripcion || null, color_hex || '#e2725b']);

        // Trigger Recálculo
        const afectados = await recalcularClientes(dbQuery, req.barberia_id);

        res.status(201).json({ 
            message: 'Nivel creado exitosamente',
            id_rol_lealtad: result.lastInsertRowid,
            clientes_afectados: afectados
        });
    } catch (error) {
        console.error('Error creando nivel de lealtad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/lealtad/niveles/:id - Editar nivel de lealtad
router.put('/niveles/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { nombre_nivel, dias_max_frecuencia, porcentaje_descuento, premio_descripcion, color_hex } = req.body;

        if (!nombre_nivel || !dias_max_frecuencia) {
            return res.status(400).json({ error: 'Nombre de nivel y días máximos son requeridos' });
        }

        const result = await dbQuery.run(`
            UPDATE barberia_lealtad_niveles 
            SET nombre_nivel = ?, dias_max_frecuencia = ?, porcentaje_descuento = ?, premio_descripcion = ?, color_hex = ?
            WHERE id_rol_lealtad = ? AND barberia_id = ?
        `, [nombre_nivel, dias_max_frecuencia, porcentaje_descuento || 0.00, premio_descripcion || null, color_hex || '#e2725b', id, req.barberia_id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Nivel no encontrado' });
        }

        // Trigger Master Recalculation
        const afectados = await recalcularClientes(dbQuery, req.barberia_id);

        res.json({ 
            message: 'Nivel actualizado exitosamente',
            clientes_afectados: afectados
        });
    } catch (error) {
        console.error('Error actualizando nivel de lealtad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// DELETE /api/lealtad/niveles/:id - Eliminar nivel de lealtad
router.delete('/niveles/:id', verifyToken, requireTenant, requireRole(ROLES.ADMIN), async (req, res) => {
     try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;

        // Primero actualizamos los clientes que lo tengan a NULL
        await dbQuery.run(`
            UPDATE clientes SET id_rol_lealtad = NULL 
            WHERE id_rol_lealtad = ? AND barberia_id = ?
        `, [id, req.barberia_id]);

        // Luego borramos el nivel
        const result = await dbQuery.run(`
            DELETE FROM barberia_lealtad_niveles 
            WHERE id_rol_lealtad = ? AND barberia_id = ?
        `, [id, req.barberia_id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Nivel no encontrado' });
        }

        res.json({ message: 'Nivel eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando nivel de lealtad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;
