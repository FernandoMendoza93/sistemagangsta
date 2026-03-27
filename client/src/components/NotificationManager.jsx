import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { initiateSocket, disconnectSocket, subscribeToEvent } from '../services/socket.js';
import { toast } from 'sonner';

export default function NotificationManager() {
    const { user } = useAuth();
    const audioRef = useRef(null);

    useEffect(() => {
        if (!user || user.rol === 'Cliente') {
            disconnectSocket();
            return;
        }

        // 1. Inicializar Socket
        const socket = initiateSocket(user.barberia_id);

        // 2. Escuchar nuevas citas
        subscribeToEvent('NUEVA_CITA', (data) => {
            console.log('🔔 NUEVA CITA RECIBIDA:', data);
            
            // Alerta Visual
            toast.success(`¡Nueva Cita! ${data.cliente} - ${data.hora}`, {
                description: `${data.servicio}`,
                duration: 10000, // 10 segundos
                action: {
                    label: 'Ver Citas',
                    onClick: () => window.location.href = '/panel/citas'
                }
            });

            // Alerta Sonora
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.warn('Bloqueo de audio por el navegador:', e));
            }
        });

        return () => {
            // No desconectamos el socket globalmente al desmontar este componente 
            // a menos que el usuario cierre sesión (manejado en AuthContext/App)
        };
    }, [user]);

    // Gestión de Sesión - "Keep Alive" si la pestaña está activa
    useEffect(() => {
        if (!user || user.rol === 'Cliente') return;

        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                // Simulamos actividad para resetear los timers de AuthContext/App
                const activityEvent = new Event('mousemove');
                window.dispatchEvent(activityEvent);
            }
        }, 60000); // Cada minuto si es visible

        return () => clearInterval(intervalId);
    }, [user]);

    return (
        <audio 
            ref={audioRef} 
            src="/assets/audio/notification.mp3" 
            preload="auto"
        />
    );
}
