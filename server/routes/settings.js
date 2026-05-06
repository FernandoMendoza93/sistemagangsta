import express from 'express';
import { verifyToken, requireRole, ROLES, requireTenant } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Usamos Admin y SuperAdmin como roles permitidos para los settings
const allowedRoles = [ROLES.ADMIN, ROLES.SUPERADMIN];

/**
 * GET /api/settings/smtp
 * Obtiene la configuración SMTP actual del Tenant. 
 * Oculta la clave devolviendo asteriscos.
 */
router.get('/smtp', verifyToken, requireTenant, requireRole(...allowedRoles), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        
        const settings = await dbQuery.get(
            `SELECT smtp_host, smtp_port, smtp_user, smtp_from_name, smtp_secure, enviar_reportes, frecuencia_reporte, emails_reporte, fidelizacion_activa, dias_inactividad, mensaje_fidelizacion, dia_reporte, hora_reporte
             FROM barberia_smtp_settings 
             WHERE barberia_id = ?`,
            [req.barberia_id]
        );

        if (!settings) {
            return res.json({ isConfigured: false });
        }

        res.json({
            isConfigured: true,
            smtp_host: settings.smtp_host,
            smtp_port: settings.smtp_port,
            smtp_user: settings.smtp_user,
            smtp_from_name: settings.smtp_from_name,
            smtp_secure: settings.smtp_secure,
            enviar_reportes: settings.enviar_reportes === 1,
            frecuencia_reporte: settings.frecuencia_reporte || 'semanal',
            emails_reporte: settings.emails_reporte || '',
            dia_reporte: settings.dia_reporte || 'Viernes',
            hora_reporte: settings.hora_reporte || '18:00',
            fidelizacion_activa: settings.fidelizacion_activa === 1,
            dias_inactividad: settings.dias_inactividad || 30,
            mensaje_fidelizacion: settings.mensaje_fidelizacion || 'Hola {nombre_cliente}, te echamos de menos. ¡Regresa pronto para un gran corte!',
            smtp_pass: '********' // Nunca exponer clave cruda
        });

    } catch (error) {
        console.error('Error fetching SMTP settings:', error);
        res.status(500).json({ error: 'Error al consultar configuraciones' });
    }
});

/**
 * POST /api/settings/smtp
 * Crea o actualiza la configuración SMTP del Tenant. Encripta la contraseña al vuelo.
 */
router.post('/smtp', verifyToken, requireTenant, requireRole(...allowedRoles), async (req, res) => {
    const { 
        smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_secure, 
        enviar_reportes, frecuencia_reporte, dia_reporte, hora_reporte,
        emails_reporte, fidelizacion_activa, dias_inactividad, mensaje_fidelizacion
    } = req.body;
    
    if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos de SMTP' });
    }

    try {
        const dbQuery = req.app.locals.dbQuery;

        const isPasswordUnchanged = smtp_pass === '********';
        const flag_reportes = enviar_reportes ? 1 : 0;
        const flag_fidelizacion = fidelizacion_activa ? 1 : 0;
        
        if (isPasswordUnchanged) {
            await dbQuery.run(
                `UPDATE barberia_smtp_settings 
                 SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_from_name = ?, smtp_secure = ?, enviar_reportes = ?, frecuencia_reporte = ?, dia_reporte = ?, hora_reporte = ?, emails_reporte = ?, fidelizacion_activa = ?, dias_inactividad = ?, mensaje_fidelizacion = ?
                 WHERE barberia_id = ?`,
                [smtp_host, smtp_port, smtp_user, smtp_from_name, smtp_secure ? 1 : 0, flag_reportes, frecuencia_reporte, dia_reporte || 'Viernes', hora_reporte || '18:00', emails_reporte, flag_fidelizacion, dias_inactividad, mensaje_fidelizacion, req.barberia_id]
            );
        } else {
            const encryptedPass = encrypt(smtp_pass);

            await dbQuery.run(
                `INSERT INTO barberia_smtp_settings (barberia_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_secure, enviar_reportes, frecuencia_reporte, dia_reporte, hora_reporte, emails_reporte, fidelizacion_activa, dias_inactividad, mensaje_fidelizacion)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 smtp_host = VALUES(smtp_host),
                 smtp_port = VALUES(smtp_port),
                 smtp_user = VALUES(smtp_user),
                 smtp_pass = VALUES(smtp_pass),
                 smtp_from_name = VALUES(smtp_from_name),
                 smtp_secure = VALUES(smtp_secure),
                 enviar_reportes = VALUES(enviar_reportes),
                 frecuencia_reporte = VALUES(frecuencia_reporte),
                 dia_reporte = VALUES(dia_reporte),
                 hora_reporte = VALUES(hora_reporte),
                 emails_reporte = VALUES(emails_reporte),
                 fidelizacion_activa = VALUES(fidelizacion_activa),
                 dias_inactividad = VALUES(dias_inactividad),
                 mensaje_fidelizacion = VALUES(mensaje_fidelizacion)`,
                [req.barberia_id, smtp_host, smtp_port, smtp_user, encryptedPass, smtp_from_name, smtp_secure ? 1 : 0, flag_reportes, frecuencia_reporte, dia_reporte || 'Viernes', hora_reporte || '18:00', emails_reporte, flag_fidelizacion, dias_inactividad, mensaje_fidelizacion]
            );
        }

        res.json({ success: true, message: 'Configuración SMTP actualizada exitosamente' });

    } catch (error) {
        console.error('Error saving SMTP settings:', error);
        res.status(500).json({ error: 'Error del servidor al guardar configuraciones' });
    }
});

/**
 * POST /api/settings/smtp/test
 * Intenta conectar al SMTP configurado y envía un correo de prueba al administrador
 */
router.post('/smtp/test', verifyToken, requireTenant, requireRole(...allowedRoles), async (req, res) => {
    try {
        const { test_email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from_name } = req.body;
        const mailTo = req.user.email || test_email;
        const dbQuery = req.app.locals.dbQuery;

        let host = smtp_host;
        let port = smtp_port;
        let user = smtp_user;
        let pass = smtp_pass;
        let secure = smtp_secure == 1;
        let fromName = smtp_from_name;

        // Si es vacío o tiene los asteriscos protectores, sacar de la BD:
        if (!user || pass === '********') {
            const settings = await dbQuery.get(
                `SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_secure
                 FROM barberia_smtp_settings 
                 WHERE barberia_id = ?`,
                [req.barberia_id]
            );

            if (!settings || !settings.smtp_pass) {
                return res.status(400).json({ error: 'Configuración SMTP incompleta o inexistente en la BD' });
            }

            const decodedPass = decrypt(settings.smtp_pass);
            if (!decodedPass) {
                return res.status(500).json({ error: 'Fallo al desencriptar la contraseña interna' });
            }

            host = settings.smtp_host;
            port = settings.smtp_port;
            user = settings.smtp_user;
            pass = decodedPass;
            secure = settings.smtp_secure === 1;
            fromName = settings.smtp_from_name;
        }

        const transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: secure,
            auth: {
                user: user,
                pass: pass
            }
        });

        // Test connection
        await transporter.verify();

        // Send Test Mail
        const finalFromName = fromName || 'Flow Barbería Test';
        await transporter.sendMail({
            from: `"${finalFromName}" <${user}>`,
            to: mailTo,
            subject: '✅ Conexión SMTP Exitosa - Flow Barber System',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #10B981;">¡Conexión Exitosa!</h2>
                    <p>Felicidades, la configuración SMTP de tu barbería está funcionando perfectamente.</p>
                    <p>Host: <strong>${host}</strong></p>
                    <hr style="border:0; border-top: 1px solid #eee;" />
                    <p style="font-size: 0.8rem; color: #999;">Generado automáticamente por el motor asíncrono de Flow.</p>
                </div>
            `
        });

        res.json({ message: 'Conexión verificada y correo de prueba enviado' });
    } catch (error) {
        console.error('SMTP Test Error:', error);
        res.status(500).json({ error: error.message || 'No se pudo conectar al servidor SMTP' });
    }
});

import { enviarReporteManual } from '../services/emailService.js';

/**
 * POST /api/settings/smtp/send-report-now
 * Construye un reporte básico de la barbería y lo envía a los correos configurados.
 */
router.post('/smtp/send-report-now', verifyToken, requireTenant, requireRole(...allowedRoles), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        const settings = await dbQuery.get(
            `SELECT emails_reporte, enviar_reportes
             FROM barberia_smtp_settings 
             WHERE barberia_id = ?`,
            [req.barberia_id]
        );

        if (!settings || !settings.emails_reporte) {
            return res.status(400).json({ error: 'No hay correos de destinatarios configurados.' });
        }

        const success = await enviarReporteManual(dbQuery, req.barberia_id, settings.emails_reporte);

        if (success) {
            res.json({ message: 'Reporte generado y enviado exitosamente a los administradores.' });
        } else {
            res.status(500).json({ error: 'Fallo al enviar el reporte. Verifica la conexión SMTP o la configuración.' });
        }
    } catch (error) {
        console.error('SMTP Send Report Error:', error);
        res.status(500).json({ error: error.message || 'Error del servidor enviando el reporte' });
    }
});

export default router;
