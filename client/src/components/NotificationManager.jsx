import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { initiateSocket, disconnectSocket, subscribeToEvent } from '../services/socket.js';
import { toast } from 'sonner';

export default function NotificationManager() {
    const { user } = useAuth();

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
                duration: 10000, 
                action: {
                    label: 'Ver Citas',
                    onClick: () => window.location.href = '/panel/citas'
                }
            });

            // Alerta de Voz Dinámica (Web Speech API)
            try {
                const mensaje = new SpeechSynthesisUtterance();
                mensaje.text = `Atención. Tienes una nueva cita de ${data.cliente} a las ${data.hora}. Repito, cita de ${data.cliente} a las ${data.hora}.`;
                mensaje.lang = 'es-MX';
                mensaje.rate = 1.1;    // Un poco más rápido como solicitó el usuario
                mensaje.pitch = 1.1;   // Tono ligeramente más agudo para sonar más femenino si la voz es neutra

                // Seleccionar una voz femenina si está disponible
                const voices = window.speechSynthesis.getVoices();
                // Buscar voces conocidas como femeninas en español
                const preferredVoice = voices.find(v => 
                    (v.lang.includes('es') || v.lang.includes('ES')) && 
                    (v.name.includes('Google') || v.name.includes('Paulina') || v.name.includes('Helena') || v.name.includes('Sabina') || v.name.includes('Female'))
                );
                
                if (preferredVoice) {
                    mensaje.voice = preferredVoice;
                }
                
                window.speechSynthesis.speak(mensaje);
            } catch (error) {
                console.warn('⚠️ Error en síntesis de voz:', error);
            }
        });

        return () => {
        };
    }, [user]);

    // Gestión de Sesión - "Keep Alive" si la pestaña está activa
    useEffect(() => {
        if (!user || user.rol === 'Cliente') return;

        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                const activityEvent = new Event('mousemove');
                window.dispatchEvent(activityEvent);
            }
        }, 60000);

        return () => clearInterval(intervalId);
    }, [user]);

    return null; // Ya no necesitamos el elemento <audio>
}
