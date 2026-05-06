import nodemailer from 'nodemailer';
import { decrypt } from '../utils/encryption.js';

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

/**
 * Envía un correo de notificación de nueva cita
 * @param {object} details Detalles de la cita (email, cliente, fecha, hora, servicio, dbQuery, barberia_id)
 */
export const sendNewAppointmentEmail = async ({ to, cliente, fecha, hora, servicio, barberiaNombre, barberia_id, dbQuery }) => {
    
    let activeTransporter = transporter; // Default fallback
    let emailFrom = `"Flow Barbería" <${process.env.MAIL_USER}>`;

    // Intentar buscar credenciales dinámicas multi-tenant
    if (barberia_id && dbQuery) {
        try {
            const settings = await dbQuery.get(
                `SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_secure
                 FROM barberia_smtp_settings 
                 WHERE barberia_id = ?`,
                [barberia_id]
            );

            if (settings && settings.smtp_host && settings.smtp_pass) {
                const decryptedPass = decrypt(settings.smtp_pass);
                if (decryptedPass) {
                    // Generar transportador dinámico exclusivo de la barbería
                    activeTransporter = nodemailer.createTransport({
                        host: settings.smtp_host,
                        port: settings.smtp_port,
                        secure: settings.smtp_secure === 1,
                        auth: {
                            user: settings.smtp_user,
                            pass: decryptedPass
                        }
                    });
                    
                    const fromName = settings.smtp_from_name || barberiaNombre || 'Flow Barbería';
                    emailFrom = `"${fromName}" <${settings.smtp_user}>`;
                }
            }
        } catch (dbErr) {
            console.error('Error cargando SMTP del tenant en emailService. Fallback a Default.', dbErr);
        }
    }

    if (!activeTransporter && (!process.env.MAIL_USER || !process.env.MAIL_PASS)) {
        console.warn('⚠️ Mailer no configurado ni global ni localmente. Saltando envío de correo.');
        return;
    }

    const mailOptions = {
        from: emailFrom,
        to: to,
        subject: `📅 Nueva Cita Agendada - ${barberiaNombre}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                <h2 style="color: #FF5F40;">¡Nueva Cita Agendada!</h2>
                <p>Hola,</p>
                <p>Se ha registrado una nueva cita en <strong>${barberiaNombre}</strong>:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Cliente:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${cliente}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Servicio:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${servicio}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Fecha:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${fecha}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Hora:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${hora}</td>
                    </tr>
                </table>
                <p style="font-size: 0.9rem; color: #666;">
                    Accede a tu panel administrativo para ver más detalles.
                </p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8rem; color: #999; text-align: center;">
                    Flow Barber Management System &copy; ${new Date().getFullYear()}
                </p>
            </div>
        `
    };

    try {
        await activeTransporter.sendMail(mailOptions);
        console.log(`📧 Correo enviado a: ${to} ${barberia_id ? '(via SMTP MultiTenant)' : '(via SMTP Global)'}`);
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
    }
};

/**
 * Función Helper Auxiliar para Fabricar Transporters Dinámicos para Tareas en Background.
 */
async function createDynamicTransporter(dbQuery, barberia_id) {
    const settings = await dbQuery.get(
        `SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure
         FROM barberia_smtp_settings WHERE barberia_id = ?`,
        [barberia_id]
    );

    if (!settings || !settings.smtp_host || !settings.smtp_pass) {
        throw new Error('La barbería no tiene configuración SMTP guardada o falta la contraseña');
    }

    const decryptedPass = decrypt(settings.smtp_pass);
    if (!decryptedPass) throw new Error('Fallo crítico al desencriptar la contraseña de la base de datos');

    return nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port,
        secure: settings.smtp_secure === 1,
        auth: {
            user: settings.smtp_user,
            pass: decryptedPass
        }
    });
}

/**
 * [MÓDULO FIDELIZACIÓN]
 * Función diseñada para ejecutarse desde un CRON JOB o tarea programada.
 * Utiliza el transporter dinámico de la barbería para enviarle un recordatorio automatizado al cliente
 * basándose en su inactividad.
 */
export async function enviarRecordatorioCliente(dbQuery, cliente_id, barberia_id) {
    try {
        // 1. Obtener la data del cliente
        const cliente = await dbQuery.get(
            `SELECT nombre, correo, telefono FROM clientes WHERE id = ? AND barberia_id = ?`,
            [cliente_id, barberia_id]
        );

        if (!cliente || !cliente.correo) {
            console.log(`Cliente ${cliente_id} no tiene correo o no existe. Skipping.`);
            return false;
        }

        // 2. Obtener la Configuración y el Mensaje Personalizado
        const settings = await dbQuery.get(
            `SELECT mensaje_fidelizacion FROM barberia_smtp_settings WHERE barberia_id = ? AND fidelizacion_activa = 1`,
            [barberia_id]
        );

        if (!settings) return false;

        const barberia = await dbQuery.get(`SELECT nombre FROM barberias WHERE id = ?`, [barberia_id]);
        
        let targetMessage = settings.mensaje_fidelizacion || 'Te echamos de menos. ¡Vuelve pronto!';
        targetMessage = targetMessage
            .replace(/{nombre_cliente}/g, cliente.nombre)
            .replace(/{nombre_barberia}/g, barberia?.nombre || 'la barbería');

        // 3. Crear transporter dinámico
        const transporter = await createDynamicTransporter(dbQuery, barberia_id);
        const fromName = barberia?.nombre || 'Flow Barbería';
        const senderInfo = transporter.options.auth?.user ? `"${fromName}" <${transporter.options.auth.user}>` : `"${fromName}" <no-reply@flowbarber.com>`;

        // 4. Enviar
        await transporter.sendMail({
            from: senderInfo,
            to: cliente.correo,
            subject: `¡Te echamos de menos en ${fromName}! ✂️`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #eaeaea;">
                    <div style="background-color: #1a1a1a; padding: 25px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">${fromName}</h2>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff; color: #333;">
                        <p style="font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${targetMessage}</p>
                        
                        <div style="margin-top: 35px; text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal" style="background-color: #10B981; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                                Agendar una Cita Ahora
                            </a>
                        </div>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eaeaea; font-size: 12px; color: #888;">
                        Enviado automáticamente por el Sistema Flow.
                    </div>
                </div>
            `
        });

        console.log(`✅ [Marketing] Correo de Fidelización enviado a ${cliente.correo}`);
        return true;

    } catch (error) {
        console.error(`❌ [Marketing] Error enviando correo fidelización a ${cliente_id}:`, error);
        return false;
    }
}

/**
 * [MÓDULO REPORTES]
 * Envía un correo con el resumen de la semana (Prueba manual o Automático)
 */
export async function enviarReporteManual(dbQuery, barberia_id, emails_destino) {
    try {
        const barberia = await dbQuery.get(`SELECT nombre FROM barberias WHERE id = ?`, [barberia_id]);
        
        // Obtener ingresos de los últimos 7 días como resumen básico
        const ventas = await dbQuery.all(`
            SELECT DATE(v.fecha) as fecha, COUNT(*) as cantidad, SUM(v.total_venta) as total_dia
            FROM ventas_cabecera v 
            WHERE v.estado = 'completada' AND v.barberia_id = ? AND v.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(v.fecha) ORDER BY fecha DESC
        `, [barberia_id]);

        let ingresosTotales = 0;
        let cortesTotales = 0;
        let filasTabla = '';

        if (ventas && ventas.length > 0) {
            ventas.forEach(v => {
                ingresosTotales += (v.total_dia || 0);
                cortesTotales += (v.cantidad || 0);
                filasTabla += `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${v.fecha}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${v.cantidad}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(v.total_dia || 0).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            filasTabla = `<tr><td colspan="3" style="padding: 8px; text-align: center; color: #999;">Sin ventas registradas en los últimos 7 días</td></tr>`;
        }

        const transporter = await createDynamicTransporter(dbQuery, barberia_id);
        const fromName = barberia?.nombre || 'Flow Barbería';
        const senderInfo = transporter.options.auth?.user ? `"${fromName} Reportes" <${transporter.options.auth.user}>` : `"${fromName} Reportes" <no-reply@flowbarber.com>`;

        // Convert emails string to array if comma separated
        const destinatarios = emails_destino.split(',').map(e => e.trim()).filter(e => e);

        await transporter.sendMail({
            from: senderInfo,
            to: destinatarios,
            subject: `📊 Resumen Semanal de Actividad - ${fromName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #eaeaea;">
                    <div style="background-color: #3b82f6; padding: 25px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Reporte de Actividad</h2>
                        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">Últimos 7 días</p>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff; color: #333;">
                        <div style="display: flex; gap: 20px; margin-bottom: 25px;">
                            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #e2e8f0;">
                                <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Tickets Totales</p>
                                <h3 style="margin: 5px 0 0 0; color: #0f172a; font-size: 24px;">${cortesTotales}</h3>
                            </div>
                            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #e2e8f0;">
                                <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Ingresos Totales</p>
                                <h3 style="margin: 5px 0 0 0; color: #10b981; font-size: 24px;">$${ingresosTotales.toFixed(2)}</h3>
                            </div>
                        </div>

                        <h4 style="color: #334155; margin-bottom: 10px;">Desglose Diario</h4>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead>
                                <tr style="background-color: #f1f5f9;">
                                    <th style="padding: 10px 8px; text-align: left; color: #475569; font-weight: 600;">Fecha</th>
                                    <th style="padding: 10px 8px; text-align: center; color: #475569; font-weight: 600;">Cant.</th>
                                    <th style="padding: 10px 8px; text-align: right; color: #475569; font-weight: 600;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filasTabla}
                            </tbody>
                        </table>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eaeaea; font-size: 12px; color: #888;">
                        Generado de forma automática por Flow Barber Management System.<br>
                        Este es un reporte de prueba o programado configurado en su panel de administración.
                    </div>
                </div>
            `
        });

        console.log(`✅ [Reportes] Reporte enviado correctamente a ${destinatarios.length} administrador(es)`);
        return true;

    } catch (error) {
        console.error(`❌ [Reportes] Error enviando reporte manual:`, error);
        return false;
    }
}
