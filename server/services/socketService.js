import { Server } from 'socket.io';

let io = null;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // En producción configurar para el dominio del frontend
            methods: ["GET", "POST"]
        }
    });

    console.log('🔌 Socket.io inicializado');

    io.on('connection', (socket) => {
        const { tenantId } = socket.handshake.query;
        
        if (tenantId) {
            const room = `tenant_${tenantId}`;
            socket.join(room);
            console.log(`👤 Usuario conectado al room: ${room} (Socket ID: ${socket.id})`);
        }

        socket.on('disconnect', () => {
            console.log('👋 Usuario desconectado:', socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io no ha sido inicializado');
    }
    return io;
};

/**
 * Emite un evento a una barbería específica
 * @param {number|string} tenantId ID de la barbería
 * @param {string} event Nombre del evento
 * @param {object} data Datos a enviar
 */
export const emitToTenant = (tenantId, event, data) => {
    if (io) {
        const room = `tenant_${tenantId}`;
        io.to(room).emit(event, data);
        console.log(`📤 Evento [${event}] enviado al room: ${room}`);
    }
};
