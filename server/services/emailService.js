import nodemailer from 'nodemailer';

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
 * @param {object} details Detalles de la cita (email, cliente, fecha, hora, servicio)
 */
export const sendNewAppointmentEmail = async ({ to, cliente, fecha, hora, servicio, barberiaNombre }) => {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        console.warn('⚠️ Mailer no configurado. Saltando envío de correo.');
        return;
    }

    const mailOptions = {
        from: `"Flow Barbería" <${process.env.MAIL_USER}>`,
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
        await transporter.sendMail(mailOptions);
        console.log(`📧 Correo enviado a: ${to}`);
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
    }
};
