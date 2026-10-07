import 'dotenv/config';
import { sendNewAppointmentEmail } from './services/emailService.js';

// Script para probar el envío de correo con Resend / Nodemailer (Desarrollo)
// Para probar, ejecuta: node test_resend.js <tu-email>

const testEmail = process.argv[2];

if (!testEmail) {
    console.error('⚠️ Debes proporcionar un correo de prueba.');
    console.log('Ejemplo: node test_resend.js hola@dominio.com');
    process.exit(1);
}

console.log('--- TEST DE ENVÍO DE CORREO ---');
console.log('RESEND_API_KEY configurado:', !!process.env.RESEND_API_KEY);
console.log('Destinatario:', testEmail);
console.log('-------------------------------');

async function test() {
    console.log('Iniciando prueba de sendNewAppointmentEmail...');
    
    // Mock dbQuery (fake)
    const fakeDbQuery = {
        get: async (query, params) => {
            console.log(`[Mock DB] Executing: ${query.substring(0, 50)}... Params:`, params);
            // Simulate a barberia config (doesn't have smtp_host to force Resend/Default fallback)
            return {
                nombre: 'Barbería de Prueba',
                email_contacto: 'contacto@barberiadeprueba.com'
            };
        }
    };

    await sendNewAppointmentEmail({
        to: testEmail,
        cliente: 'Juan Perez',
        fecha: '2026-10-10',
        hora: '14:30',
        servicio: 'Corte Premium',
        barberiaNombre: 'Barbería de Prueba',
        barberia_id: 1,
        dbQuery: fakeDbQuery
    });

    console.log('✅ Prueba completada (revisa tu consola y tu bandeja de entrada).');
    process.exit(0);
}

test();
