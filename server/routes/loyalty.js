import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_2024';

// POST /api/loyalty/claim — Cliente reclama su sello
router.post('/claim', verifyToken, async (req, res) => {
    try {
        const { token } = req.body;
        const db = req.app.locals.db;
        const dbQuery = req.app.locals.dbQuery;

        if (!token) {
            return res.status(400).json({ error: 'Token requerido' });
        }

        // El usuario debe ser un cliente
        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Solo clientes pueden reclamar sellos' });
        }

        // Asegurar que la tabla existe
        db.exec(`
            CREATE TABLE IF NOT EXISTS loyalty_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venta_id INTEGER NOT NULL UNIQUE,
                id_cliente INTEGER,
                usado INTEGER DEFAULT 0,
                fecha_uso TEXT,
                FOREIGN KEY (id_cliente) REFERENCES clientes(id)
            );
        `);

        // Verificar firma y expiración del JWT
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(410).json({ error: 'Este QR ya expiró ⏰', expired: true });
            }
            return res.status(400).json({ error: 'QR inválido' });
        }

        // Verificar que sea un token de loyalty
        if (decoded.tipo !== 'loyalty_stamp') {
            return res.status(400).json({ error: 'QR inválido' });
        }

        const ventaId = decoded.venta_id;

        // Verificar que la venta exista
        const venta = await dbQuery.get('SELECT id FROM ventas_cabecera WHERE id = ?', [ventaId]);
        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        // Verificar si ya fue usado
        const tokenRecord = await dbQuery.get('SELECT * FROM loyalty_tokens WHERE venta_id = ?', [ventaId]);
        if (tokenRecord && tokenRecord.usado) {
            return res.status(409).json({ error: 'Este QR ya fue canjeado ✅', already_used: true });
        }

        // Registrar el uso del token
        if (tokenRecord) {
            await dbQuery.run(`
                UPDATE loyalty_tokens SET usado = 1, id_cliente = ?, fecha_uso = datetime('now', 'localtime')
                WHERE venta_id = ?
            `, [req.user.id, ventaId]);
        } else {
            await dbQuery.run(`
                INSERT INTO loyalty_tokens (venta_id, id_cliente, usado, fecha_uso)
                VALUES (?, ?, 1, datetime('now', 'localtime'))
            `, [ventaId, req.user.id,]);
        }

        // Sumar punto de lealtad
        await dbQuery.run(`
            UPDATE clientes 
            SET puntos_lealtad = puntos_lealtad + 1,
                ultima_visita = datetime('now', 'localtime')
            WHERE id = ?
        `, [req.user.id]);

        // Confirmar la venta (estado pendiente → completada)
        await dbQuery.run(`
            UPDATE ventas_cabecera SET estado = 'completada' WHERE id = ? AND estado = 'pendiente'
        `, [ventaId]);

        // Obtener puntos actualizados
        const cliente = await dbQuery.get('SELECT puntos_lealtad FROM clientes WHERE id = ?', [req.user.id]);

        console.log(`✅ Sello reclamado: cliente ${req.user.nombre} — ahora tiene ${cliente.puntos_lealtad} puntos — venta #${ventaId} confirmada`);

        res.json({
            message: '¡Sello reclamado! 💈',
            puntos: cliente.puntos_lealtad,
            puntos_para_regalo: 10 - (cliente.puntos_lealtad % 10)
        });

    } catch (error) {
        console.error('❌ Error reclamando sello:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
