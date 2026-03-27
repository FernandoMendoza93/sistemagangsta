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
                mensaje.rate = 1.4;    // Aumentado significativamente
                mensaje.pitch = 1.3;   // Tono más agudo para forzar femineidad

                // Forzar búsqueda de voz femenina
                const voices = window.speechSynthesis.getVoices();
                
                // Criterios de búsqueda: español + nombres típicamente femeninos o etiquetas de voz
                const femaleVoice = voices.find(v => 
                    (v.lang.includes('es') || v.lang.includes('ES')) && 
                    (
                        v.name.toLowerCase().includes('google') || 
                        v.name.toLowerCase().includes('mexic') ||
                        v.name.toLowerCase().includes('female') ||
                        v.name.toLowerCase().includes('paulina') ||
                        v.name.toLowerCase().includes('helena') ||
                        v.name.toLowerCase().includes('sabina') ||
                        v.name.toLowerCase().includes('lucia') ||
                        v.name.toLowerCase().includes('monica') ||
                        v.name.toLowerCase().includes('zira')
                    )
                );
                
                if (femaleVoice) {
                    mensaje.voice = femaleVoice;
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
