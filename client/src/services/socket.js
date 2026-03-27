import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

let socket = null;

export const initiateSocket = (tenantId) => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
        query: { tenantId },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 5000
    });

    console.log(`🔌 Conectando a Socket.io para tenant: ${tenantId}...`);

    socket.on('connect', () => {
        console.log('✅ Conectado al servidor de WebSockets');
    });

    socket.on('connect_error', (err) => {
        console.error('❌ Error de conexión Socket:', err.message);
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        console.log('👋 Desconectando Socket...');
        socket.disconnect();
        socket = null;
    }
};

export const subscribeToEvent = (event, callback) => {
    if (!socket) return;
    socket.on(event, callback);
};

export const unsubscribeFromEvent = (event) => {
    if (!socket) return;
    socket.off(event);
};

export const getSocket = () => socket;
