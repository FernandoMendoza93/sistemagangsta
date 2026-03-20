import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'flow_barber_logos',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'svg'],
        public_id: (req, file) => `tenant_logo_${req.params.id}_${Date.now()}`
    }
});

const upload = multer({ storage: storage });

const router = express.Router();

// GET /api/public/config/:slug — Public Endpoint for Client Portal (No Authentication Required)
router.get('/public/config/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const dbQuery = req.app.locals.dbQuery;
        
        const config = await dbQuery.get(
            `SELECT id as barberia_id, nombre, theme, logo_url, loyalty_card_image_url, color_acento 
             FROM barberias WHERE slug = ? AND activo = 1`, 
            [slug]
        );

        if (!config) {
            return res.status(404).json({ error: 'Barbería no encontrada o inactiva' });
        }

        res.json(config);
    } catch (error) {
        console.error('Error fetching public config:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/super/temas — List all available master palettes
router.get('/temas', verifyToken, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const temas = await dbQuery.all('SELECT * FROM temas ORDER BY id ASC');
        res.json(temas);
    } catch (error) {
        console.error('Error obteniendo temas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/super/barberias/:id/config — Get visual config for a specific barberia (Isolating Engram 002)
router.get('/barberias/:id/config', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const dbQuery = req.app.locals.dbQuery;

        // Security: Ensure user is SuperAdmin OR Admin of this specific barberia
        if (req.user.rol !== 'SuperAdmin' && req.user.barberia_id !== parseInt(id)) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta configuración' });
        }

        const barberia = await dbQuery.get(
            `SELECT b.id, b.nombre, b.logo_url, b.color_acento, b.slug,
                    t.bg_main, t.bg_surface, t.accent_primary, t.accent_secondary, t.text_main, t.text_muted, t.clase_glass
             FROM barberias b
             LEFT JOIN temas t ON b.tema_id = t.id
             WHERE b.id = ?`,
            [id]
        );

        if (!barberia) {
            return res.status(404).json({ error: 'Barbería no encontrada' });
        }

        res.json(barberia);
    } catch (error) {
        console.error('Error obteniendo config de barbería:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/super/barberias/:id/config — Update barberia profile (Name, Address, Logo, Theme, Loyalty Card)
router.put('/barberias/:id/config', verifyToken, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'loyalty_card', maxCount: 1 }]), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, direccion, theme } = req.body;
        const dbQuery = req.app.locals.dbQuery;

        // Security: Ensure user is SuperAdmin OR Admin of this specific barberia
        if (req.user.rol !== 'SuperAdmin' && req.user.barberia_id !== parseInt(id)) {
            return res.status(403).json({ error: 'No tienes permiso para modificar esta barbería' });
        }

        let logoUrl = null;
        let loyaltyCardUrl = null;
        
        if (req.files) {
            if (req.files['logo'] && req.files['logo'][0]) {
                logoUrl = req.files['logo'][0].path; // Cloudinary full URL
            }
            if (req.files['loyalty_card'] && req.files['loyalty_card'][0]) {
                loyaltyCardUrl = req.files['loyalty_card'][0].path; // Cloudinary full URL
            }
        }

        let updates = [];
        let params = [];
        
        if (nombre) { 
            updates.push('nombre = ?'); 
            params.push(nombre); 
        }
        
        if (direccion !== undefined) { 
            updates.push('direccion = ?'); 
            params.push(direccion); 
        }
        
        if (logoUrl) { 
            updates.push('logo_url = ?'); 
            params.push(logoUrl); 
        }
        
        if (loyaltyCardUrl) {
            updates.push('loyalty_card_image_url = ?');
            params.push(loyaltyCardUrl);
        }
        
        if (theme) {
            updates.push('theme = ?');
            params.push(theme);
        }

        if (updates.length > 0) {
            params.push(id);
            const result = await dbQuery.run(
                `UPDATE barberias SET ${updates.join(', ')} WHERE id = ?`,
                params
            );

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Barbería no encontrada' });
            }
        }

        res.json({ 
            message: 'Configuración actualizada correctamente',
            updates: { nombre, direccion, logo_url: logoUrl, loyalty_card_image_url: loyaltyCardUrl, theme }
        });
    } catch (error) {
        console.error('Error actualizando config de barbería:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PATCH /api/super/barberias/:id/tema — Update a barberia's theme
// Restricted to the barberia's own admin or SuperAdmin
router.patch('/barberias/:id/tema', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tema_id } = req.body;
        const dbQuery = req.app.locals.dbQuery;

        // Security: Ensure user is SuperAdmin OR Admin of this specific barberia
        if (req.user.rol !== 'SuperAdmin' && req.user.barberia_id !== parseInt(id)) {
            return res.status(403).json({ error: 'No tienes permiso para modificar esta barbería' });
        }

        if (!tema_id) {
            return res.status(400).json({ error: 'tema_id es requerido' });
        }

        // Verify theme exists
        const theme = await dbQuery.get('SELECT id FROM temas WHERE id = ?', [tema_id]);
        if (!theme) {
            return res.status(404).json({ error: 'Tema no encontrado' });
        }

        const result = await dbQuery.run(
            'UPDATE barberias SET tema_id = ? WHERE id = ?',
            [tema_id, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Barbería no encontrada' });
        }

        res.json({ message: 'Tema actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando tema de barbería:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
