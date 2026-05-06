import express from 'express';
import { verifyToken, requireTenant, requireRole, ROLES } from '../middleware/auth.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

// Configuración de Cloudinary (reutilizando la lógica de temas)
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'flow_barber_landings',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: (req, file) => `landing_bg_${req.barberia_id}_${Date.now()}`
    }
});

const upload = multer({ storage: storage });

/**
 * PUT /api/configuracion/landing
 * Actualiza la información de la landing page de la barbería
 */
router.put('/landing', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.SUPERADMIN), upload.single('landing_imagen'), async (req, res) => {
    try {
        const { landing_titulo, landing_descripcion } = req.body;
        const dbQuery = req.app.locals.dbQuery;
        
        let landing_imagen_fondo = req.body.landing_imagen_fondo; // Si mandan la URL actual
        
        // Si se subió una nueva imagen, usamos la URL de Cloudinary
        if (req.file) {
            landing_imagen_fondo = req.file.path;
        }

        await dbQuery.run(`
            UPDATE barberias 
            SET landing_titulo = ?, 
                landing_descripcion = ?, 
                landing_imagen_fondo = ?
            WHERE id = ?
        `, [
            landing_titulo || 'Bienvenido a nuestra barbería', 
            landing_descripcion || 'Agenda tu cita, acumula puntos y accede a beneficios exclusivos.', 
            landing_imagen_fondo || null, 
            req.barberia_id
        ]);

        res.json({ 
            success: true, 
            message: 'Landing page actualizada correctamente',
            data: { landing_titulo, landing_descripcion, landing_imagen_fondo }
        });
    } catch (error) {
        console.error('Error actualizando landing:', error);
        res.status(500).json({ error: 'Error interno del servidor al guardar la landing' });
    }
});

export default router;
