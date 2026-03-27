import express from 'express';
import { verifyToken, requireRole, requireTenant, ROLES } from '../middleware/auth.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { emitToTenant } from '../services/socketService.js';
import { sendNewAppointmentEmail } from '../services/emailService.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Mexico_City");

const router = express.Router();

// Utilidad: Sumar minutos a hora (HH:MM -> '10:00' + 45 -> '10:45')
function addMinutes(timeStr, minsToAdd) {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m + minsToAdd);
    return date.toTimeString().slice(0, 5);
}

// Utilidad: Obtener horario del barbero desde DB (reemplaza el hardcode getHorarioDia)
async function getHorarioFromDB(dbQuery, id_barbero, dayOfWeek, barberia_id) {
    const horario = await dbQuery.get(`
        SELECT hora_inicio as apertura, hora_fin as cierre
        FROM horarios_barberos
        WHERE id_barbero = ? AND dia_semana = ? AND barberia_id = ? AND activo = 1
    `, [id_barbero, dayOfWeek, barberia_id]);

    if (horario) {
        horario.intervalo = 45; // Slot duration en minutos
    }
    return horario;
}

// GET /api/citas/mis-citas - Citas del cliente logueado
router.get('/mis-citas', verifyToken, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden ver sus citas' });
        }

        const citas = await dbQuery.all(`
            SELECT c.id, c.fecha, c.hora, c.estado, c.notas, c.fecha_creacion,
                   s.nombre_servicio, s.precio, s.duracion_aprox,
                   u.nombre as barbero_nombre
            FROM citas c
            LEFT JOIN servicios s ON c.id_servicio = s.id
            LEFT JOIN barberos b ON c.id_barbero = b.id
            LEFT JOIN usuarios u ON b.id_usuario = u.id
            WHERE c.id_cliente = ? AND c.barberia_id = ?
            ORDER BY c.fecha DESC, c.hora DESC
        `, [req.user.id, req.barberia_id]);

        res.json(citas);
    } catch (error) {
        console.error('Error obteniendo citas del cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/citas - Crear cita (solo clientes)
router.post('/', verifyToken, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden agendar citas' });
        }

        let { id_servicio, id_barbero, fecha, hora, notas } = req.body;

        if (!fecha || !hora || !id_servicio) {
            return res.status(400).json({ error: 'Fecha, hora y servicio son requeridos' });
        }

        // Elegir primer barbero activo del tenant si no se especificó
        if (!id_barbero) {
            const primero = await dbQuery.get('SELECT id FROM barberos WHERE barberia_id = ? AND estado = \'Activo\' LIMIT 1', [req.barberia_id]);
            if (!primero) return res.status(400).json({ error: 'No hay barberos disponibles en este negocio' });
            id_barbero = primero.id;
        }

        // Verificar que el barbero pertenece a este tenant
        const barberoValido = await dbQuery.get('SELECT id FROM barberos WHERE id = ? AND barberia_id = ? AND estado = \'Activo\'', [id_barbero, req.barberia_id]);
        if (!barberoValido) return res.status(400).json({ error: 'Barbero no disponible en este negocio' });

        // Verificar que el servicio pertenece al tenant
        const servicio = await dbQuery.get('SELECT duracion_aprox FROM servicios WHERE id = ? AND barberia_id = ?', [id_servicio, req.barberia_id]);
        if (!servicio) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        const duracionTotal = servicio.duracion_aprox + 15;
        const horaFin = addMinutes(hora, duracionTotal);

        const dateObj = dayjs.tz(fecha, "America/Mexico_City");
        const dayOfWeek = dateObj.day();
        const horarioLaboral = await getHorarioFromDB(dbQuery, id_barbero, dayOfWeek, req.barberia_id);

        if (!horarioLaboral) {
            return res.status(400).json({ error: `El barbero seleccionado no trabaja ese día de la semana` });
        }

        if (hora < horarioLaboral.apertura) {
            return res.status(400).json({ error: 'La hora seleccionada es antes de la apertura del local' });
        }

        if (horaFin > horarioLaboral.cierre) {
            return res.status(400).json({
                error: 'El servicio excede el horario de cierre',
                detalles: `El servicio termina a las ${horaFin}, pero cerramos a las ${horarioLaboral.cierre}`
            });
        }

        // Validación Tetris — filtrada por tenant
        const citasExistentes = await dbQuery.all(`
            SELECT c.hora as hora_inicio, s.duracion_aprox
            FROM citas c
            JOIN servicios s ON c.id_servicio = s.id
            WHERE c.id_barbero = ? AND c.fecha = ? AND c.estado != 'Cancelada' AND c.barberia_id = ?
        `, [id_barbero, fecha, req.barberia_id]);

        for (const cita of citasExistentes) {
            const exInicio = cita.hora_inicio;
            const exFin = addMinutes(exInicio, cita.duracion_aprox + 15);

            if (hora < exFin && horaFin > exInicio) {
                return res.status(409).json({
                    error: 'Este horario ya ha sido reservado o choca con otra cita',
                    detalles: `Ya existe ocupación entre las ${exInicio} y ${exFin}`
                });
            }
        }

        const result = await dbQuery.run(`
            INSERT INTO citas (id_cliente, id_servicio, id_barbero, fecha, hora, notas, barberia_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, id_servicio, id_barbero, fecha, hora, notas || null, req.barberia_id]);

        // --- NOTIFICACIONES ---
        try {
            // Obtener info extendida para la notificación
            const info = await dbQuery.get(`
                SELECT 
                    c.nombre as cliente_nombre,
                    s.nombre_servicio,
                    b_u.email as barbero_email,
                    barb.nombre as barberia_nombre,
                    barb.email_contacto as barberia_email
                FROM clientes c
                JOIN servicios s ON s.id = ?
                JOIN barberos b ON b.id = ?
                JOIN usuarios b_u ON b.id_usuario = b_u.id
                JOIN barberias barb ON barb.id = ?
                WHERE c.id = ?
            `, [id_servicio, id_barbero, req.barberia_id, req.user.id]);

            if (info) {
                // 1. Notificación en Tiempo Real (WebSocket)
                emitToTenant(req.barberia_id, 'NUEVA_CITA', {
                    cliente: info.cliente_nombre,
                    hora: hora,
                    fecha: fecha,
                    servicio: info.nombre_servicio
                });

                // 2. Notificación por Correo (Respaldo)
                const emails = [info.barberia_email, info.barbero_email].filter(Boolean);
                for (const email of emails) {
                    sendNewAppointmentEmail({
                        to: email,
                        cliente: info.cliente_nombre,
                        fecha: dayjs(fecha).format('DD/MM/YYYY'),
                        hora: hora,
                        servicio: info.nombre_servicio,
                        barberiaNombre: info.barberia_nombre
                    });
                }
            }
        } catch (notifErr) {
            console.error('⚠️ Error en proceso de notificación:', notifErr.message);
        }

        res.status(201).json({
            message: 'Cita agendada exitosamente',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error creando cita:', error);
        res.status(500).json({ error: 'Error en el servidor al crear la cita' });
    }
});

// GET /api/citas/diasDisponibles?id_barbero=X — días de la semana en que trabaja el barbero
router.get('/diasDisponibles', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id_barbero } = req.query;

        if (!id_barbero) {
            return res.status(400).json({ error: 'id_barbero requerido' });
        }

        const horarios = await dbQuery.all(`
            SELECT dia_semana FROM horarios_barberos
            WHERE id_barbero = ? AND barberia_id = ? AND activo = 1
            ORDER BY dia_semana ASC
        `, [id_barbero, req.barberia_id]);

        res.json({ dias: horarios.map(h => h.dia_semana) });
    } catch (error) {
        console.error('Error obteniendo días disponibles:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/citas/disponibilidad - Horas ocupadas por fecha y barbero
router.get('/disponibilidad', verifyToken, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { fecha, id_barbero } = req.query;

        if (!fecha) {
            return res.status(400).json({ error: 'Fecha requerida' });
        }
        if (!id_barbero) {
            return res.status(400).json({ error: 'id_barbero requerido' });
        }

        const dateObj = dayjs.tz(fecha, "America/Mexico_City");
        const dayOfWeek = dateObj.day();
        const horarioLaboral = await getHorarioFromDB(dbQuery, id_barbero, dayOfWeek, req.barberia_id);

        if (!horarioLaboral) {
            // Barbero no trabaja ese día
            return res.json({ horario: null, ocupadas: [] });
        }

        const citasOcupadas = await dbQuery.all(`
            SELECT c.hora as inicio, s.duracion_aprox
            FROM citas c
            JOIN servicios s ON c.id_servicio = s.id
            WHERE c.id_barbero = ? AND c.fecha = ? AND c.estado != 'Cancelada' AND c.barberia_id = ?
        `, [id_barbero, fecha, req.barberia_id]);

        const intervalosOcupados = citasOcupadas.map(c => ({
            inicio: c.inicio,
            fin: addMinutes(c.inicio, c.duracion_aprox + 15)
        }));

        res.json({
            horario: horarioLaboral,
            ocupadas: intervalosOcupados
        });
    } catch (error) {
        console.error('Error obteniendo disponibilidad:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/citas - Todas las citas (Admin/Encargado/Barbero) — filtrado por tenant
router.get('/', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { fecha, estado } = req.query;

        let query = `
            SELECT c.id, c.fecha, c.hora, c.estado, c.notas, c.fecha_creacion,
                   cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
                   s.nombre_servicio, s.precio, s.duracion_aprox,
                   u.nombre as barbero_nombre
            FROM citas c
            JOIN clientes cl ON c.id_cliente = cl.id
            LEFT JOIN servicios s ON c.id_servicio = s.id
            LEFT JOIN barberos b ON c.id_barbero = b.id
            LEFT JOIN usuarios u ON b.id_usuario = u.id
        `;

        const conditions = ['c.barberia_id = ?'];
        const params = [req.barberia_id];

        // Filtro restrictivo para Barberos
        if (req.user.rol === 'Barbero') {
            const barbero = await dbQuery.get('SELECT id FROM barberos WHERE id_usuario = ? AND barberia_id = ?', [req.user.id, req.barberia_id]);
            if (!barbero) {
                return res.json([]);
            }
            conditions.push('c.id_barbero = ?');
            params.push(barbero.id);
        }

        if (fecha) {
            conditions.push('c.fecha = ?');
            params.push(fecha);
        }

        if (estado) {
            conditions.push('c.estado = ?');
            params.push(estado);
        }

        query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY c.fecha ASC, c.hora ASC';

        const citas = await dbQuery.all(query, params);
        res.json(citas);
    } catch (error) {
        console.error('Error listando citas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/citas/:id - Modificar cita (solo el cliente dueño)
router.put('/:id', verifyToken, requireTenant, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden modificar sus citas' });
        }

        const { id } = req.params;
        let { id_servicio, id_barbero, fecha, hora, notas } = req.body;

        if (!fecha || !hora || !id_servicio) {
            return res.status(400).json({ error: 'Fecha, hora y servicio son requeridos' });
        }

        // Verificar que la cita pertenece al cliente
        const citaExistente = await dbQuery.get(
            'SELECT id FROM citas WHERE id = ? AND id_cliente = ? AND barberia_id = ? AND estado != ?',
            [id, req.user.id, req.barberia_id, 'Cancelada']
        );

        if (!citaExistente) {
            return res.status(404).json({ error: 'Cita no encontrada o ya cancelada' });
        }

        if (!id_barbero) id_barbero = 1;

        // Verificar servicio
        const servicio = await dbQuery.get('SELECT duracion_aprox FROM servicios WHERE id = ? AND barberia_id = ?', [id_servicio, req.barberia_id]);
        if (!servicio) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        const duracionTotal = servicio.duracion_aprox + 15;
        const horaFin = addMinutes(hora, duracionTotal);

        const dateObj = dayjs.tz(fecha, "America/Mexico_City");
        const dayOfWeek = dateObj.day();
        const horarioLaboral = await getHorarioFromDB(dbQuery, id_barbero, dayOfWeek, req.barberia_id);

        if (!horarioLaboral) {
            return res.status(400).json({ error: 'El barbero no trabaja este día' });
        }

        if (hora < horarioLaboral.apertura) {
            return res.status(400).json({ error: 'La hora seleccionada es antes de la apertura del local' });
        }

        if (horaFin > horarioLaboral.cierre) {
            return res.status(400).json({
                error: 'El servicio excede el horario de cierre',
                detalles: `El servicio termina a las ${horaFin}, pero cerramos a las ${horarioLaboral.cierre}`
            });
        }

        // Validación Tetris — excluir la cita que se está editando
        const citasExistentes = await dbQuery.all(`
            SELECT c.hora as hora_inicio, s.duracion_aprox
            FROM citas c
            JOIN servicios s ON c.id_servicio = s.id
            WHERE c.id_barbero = ? AND c.fecha = ? AND c.estado != 'Cancelada' AND c.barberia_id = ? AND c.id != ?
        `, [id_barbero, fecha, req.barberia_id, id]);

        for (const cita of citasExistentes) {
            const exInicio = cita.hora_inicio;
            const exFin = addMinutes(exInicio, cita.duracion_aprox + 15);

            if (hora < exFin && horaFin > exInicio) {
                return res.status(409).json({
                    error: 'Este horario ya ha sido reservado o choca con otra cita',
                    detalles: `Ya existe ocupación entre las ${exInicio} y ${exFin}`
                });
            }
        }

        await dbQuery.run(`
            UPDATE citas SET id_servicio = ?, id_barbero = ?, fecha = ?, hora = ?, notas = ?
            WHERE id = ? AND id_cliente = ? AND barberia_id = ?
        `, [id_servicio, id_barbero, fecha, hora, notas || null, id, req.user.id, req.barberia_id]);

        res.json({ message: 'Cita modificada exitosamente' });
    } catch (error) {
        console.error('Error modificando cita:', error);
        res.status(500).json({ error: 'Error en el servidor al modificar la cita' });
    }
});

// PUT /api/citas/:id/estado - Cambiar estado (Admin/Encargado/Barbero)
router.put('/:id/estado', verifyToken, requireTenant, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const { id } = req.params;
        const { estado } = req.body;

        const validEstados = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'];
        if (!validEstados.includes(estado)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }

        await dbQuery.run('UPDATE citas SET estado = ? WHERE id = ? AND barberia_id = ?', [estado, id, req.barberia_id]);
        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error actualizando cita:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/citas/perfil - Perfil del cliente logueado
router.get('/perfil', verifyToken, async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Acceso solo para clientes' });
        }

        const cliente = await dbQuery.get(`
            SELECT id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro
            FROM clientes
            WHERE id = ? AND barberia_id = ?
        `, [req.user.id, req.barberia_id]);

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(cliente);
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
