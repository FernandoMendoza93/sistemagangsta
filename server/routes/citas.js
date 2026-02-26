import express from 'express';
import { verifyToken, requireRole, ROLES } from '../middleware/auth.js';

const router = express.Router();

// Utilidad: Sumar minutos a hora (HH:MM -> '10:00' + 45 -> '10:45')
function addMinutes(timeStr, minsToAdd) {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m + minsToAdd);
    return date.toTimeString().slice(0, 5); // Retorna 'HH:MM'
}

// Utilidad: Obtener horario de apertura/cierre de Fernando según día de semana
function getHorarioDia(dayOfWeek) {
    // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado
    if (dayOfWeek === 5) return { apertura: '17:00', cierre: '21:00' }; // Viernes
    if (dayOfWeek === 6) return { apertura: '10:00', cierre: '21:00' }; // Sabado
    if (dayOfWeek === 0) return { apertura: '10:30', cierre: '19:00' }; // Domingo
    return { apertura: '10:00', cierre: '20:00' }; // Lunes-Jueves (Genérico)
}

// GET /api/citas/mis-citas - Citas del cliente logueado
router.get('/mis-citas', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden ver sus citas' });
        }

        const citas = db.prepare(`
            SELECT c.id, c.fecha, c.hora, c.estado, c.notas, c.fecha_creacion,
                   s.nombre_servicio, s.precio, s.duracion_aprox,
                   u.nombre as barbero_nombre
            FROM citas c
            LEFT JOIN servicios s ON c.id_servicio = s.id
            LEFT JOIN barberos b ON c.id_barbero = b.id
            LEFT JOIN usuarios u ON b.id_usuario = u.id
            WHERE c.id_cliente = ?
            ORDER BY c.fecha DESC, c.hora DESC
        `).all(req.user.id);

        res.json(citas);
    } catch (error) {
        console.error('Error obteniendo citas del cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/citas - Crear cita (solo clientes)
router.post('/', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden agendar citas' });
        }

        let { id_servicio, id_barbero, fecha, hora, notas } = req.body;

        if (!fecha || !hora || !id_servicio) {
            return res.status(400).json({ error: 'Fecha, hora y servicio son requeridos' });
        }

        // Asignar por defecto a Fernando Mendoza (id_barbero: 1) si no viene uno
        if (!id_barbero) {
            id_barbero = 1;
        }

        // Obtener la duración del servicio
        const servicio = db.prepare('SELECT duracion_aprox FROM servicios WHERE id = ?').get(id_servicio);
        if (!servicio) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        // Calculamos hora de fin (+15 min de colchón/preparación)
        const duracionTotal = servicio.duracion_aprox + 15;
        const horaFin = addMinutes(hora, duracionTotal);

        // Verificamos si excede el horario laboral
        const dateObj = new Date(fecha + 'T00:00:00'); // Evita timezone offset issues
        const dayOfWeek = dateObj.getDay(); // 0(Dom) a 6(Sab)
        const horarioLaboral = getHorarioDia(dayOfWeek);

        if (hora < horarioLaboral.apertura) {
            return res.status(400).json({ error: 'La hora seleccionada es antes de la apertura del local' });
        }

        if (horaFin > horarioLaboral.cierre) {
            return res.status(400).json({
                error: 'El servicio excede el horario de cierre',
                detalles: `El servicio termina a las ${horaFin}, pero cerramos a las ${horarioLaboral.cierre}`
            });
        }

        // Validación "Tetris" (Solapamiento de intervalos):
        // Dos intervalos (A y B) se cruzan si: Inicio_A < Fin_B  Y  Fin_A > Inicio_B
        const citasExistentes = db.prepare(`
            SELECT c.hora as hora_inicio, s.duracion_aprox
            FROM citas c
            JOIN servicios s ON c.id_servicio = s.id
            WHERE c.id_barbero = ? AND c.fecha = ? AND c.estado != 'Cancelada'
        `).all(id_barbero, fecha);

        for (const cita of citasExistentes) {
            const exInicio = cita.hora_inicio;
            const exFin = addMinutes(exInicio, cita.duracion_aprox + 15);

            // ¿Hay solapamiento?
            if (hora < exFin && horaFin > exInicio) {
                return res.status(409).json({
                    error: 'Este horario ya ha sido reservado o choca con otra cita',
                    detalles: `Ya existe ocupación entre las ${exInicio} y ${exFin}`
                });
            }
        }

        const result = db.prepare(`
            INSERT INTO citas (id_cliente, id_servicio, id_barbero, fecha, hora, notas)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(req.user.id, id_servicio, id_barbero, fecha, hora, notas || null);

        res.status(201).json({
            message: 'Cita agendada exitosamente',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error creando cita:', error);
        res.status(500).json({ error: 'Error en el servidor al crear la cita' });
    }
});

// GET /api/citas/disponibilidad - Horas ocupadas por fecha y barbero
router.get('/disponibilidad', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { fecha, id_barbero = 1 } = req.query; // Por defecto Fernando (id=1)

        if (!fecha) {
            return res.status(400).json({ error: 'Fecha requerida' });
        }

        const dateObj = new Date(fecha + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();
        const horarioLaboral = getHorarioDia(dayOfWeek);

        // Obtener citas del barbero para calcular los intervalos [{inicio, fin}]
        const citasOcupadas = db.prepare(`
            SELECT c.hora as inicio, s.duracion_aprox
            FROM citas c
            JOIN servicios s ON c.id_servicio = s.id
            WHERE c.id_barbero = ? AND c.fecha = ? AND c.estado != 'Cancelada'
        `).all(id_barbero, fecha);

        const intervalosOcupados = citasOcupadas.map(c => ({
            inicio: c.inicio,
            fin: addMinutes(c.inicio, c.duracion_aprox + 15)
        }));

        res.json({
            horario: horarioLaboral,
            ocupadas: intervalosOcupados // Ahora se envía array de objetos {inicio, fin}
        });
    } catch (error) {
        console.error('Error obteniendo disponibilidad:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/citas - Todas las citas (Admin/Encargado/Barbero)
router.get('/', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { fecha, estado } = req.query;

        let query = `
            SELECT c.id, c.fecha, c.hora, c.estado, c.notas, c.fecha_creacion,
                   cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
                   s.nombre_servicio, s.precio,
                   u.nombre as barbero_nombre
            FROM citas c
            JOIN clientes cl ON c.id_cliente = cl.id
            LEFT JOIN servicios s ON c.id_servicio = s.id
            LEFT JOIN barberos b ON c.id_barbero = b.id
            LEFT JOIN usuarios u ON b.id_usuario = u.id
        `;

        const conditions = [];
        const params = [];

        // Filtro restrictivo para Barberos
        if (req.user.rol === 'Barbero') {
            const barbero = db.prepare('SELECT id FROM barberos WHERE id_usuario = ?').get(req.user.id);
            if (!barbero) {
                return res.json([]); // No es un barbero registrado
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

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY c.fecha ASC, c.hora ASC';

        const citas = db.prepare(query).all(...params);
        res.json(citas);
    } catch (error) {
        console.error('Error listando citas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// PUT /api/citas/:id/estado - Cambiar estado (Admin/Encargado/Barbero)
router.put('/:id/estado', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO, ROLES.BARBERO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { estado } = req.body;

        const validEstados = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'];
        if (!validEstados.includes(estado)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }

        db.prepare('UPDATE citas SET estado = ? WHERE id = ?').run(estado, id);
        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error actualizando cita:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/citas/perfil - Perfil del cliente logueado (puntos, última visita)
router.get('/perfil', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        if (req.user.rol !== 'Cliente') {
            return res.status(403).json({ error: 'Acceso solo para clientes' });
        }

        const cliente = db.prepare(`
            SELECT id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro
            FROM clientes
            WHERE id = ?
        `).get(req.user.id);

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
