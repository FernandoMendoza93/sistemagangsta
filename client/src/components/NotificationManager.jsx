import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { initiateSocket, disconnectSocket, subscribeToEvent } from '../services/socket.js';
import { toast } from 'sonner';

export default function NotificationManager() {
    const { user } = useAuth();
    const audioRef = useRef(null);
    const lastDataRef = useRef(null);

    const hablarCita = (data) => {
        try {
            const mensaje = new SpeechSynthesisUtterance();
            mensaje.text = `Atención. Tienes una nueva cita de ${data.cliente} a las ${data.hora}. Repito, cita de ${data.cliente} a las ${data.hora}.`;
            mensaje.lang = 'es-MX';
            mensaje.rate = 1.4;
            mensaje.pitch = 1.3;

            const voices = window.speechSynthesis.getVoices();
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
            
            if (femaleVoice) mensaje.voice = femaleVoice;
            window.speechSynthesis.speak(mensaje);
        } catch (error) {
            console.warn('⚠️ Error en síntesis de voz:', error);
        }
    };

    useEffect(() => {
        if (!user || user.rol === 'Cliente') {
            disconnectSocket();
            return;
        }

        const socket = initiateSocket(user.barberia_id);

        subscribeToEvent('NUEVA_CITA', (data) => {
            console.log('🔔 NUEVA CITA RECIBIDA:', data);
            lastDataRef.current = data;
            
            // Alerta Visual
            toast.success(`¡Nueva Cita! ${data.cliente} - ${data.hora}`, {
                description: `${data.servicio}`,
                duration: 10000, 
                action: {
                    label: 'Ver Citas',
                    onClick: () => window.location.href = '/panel/citas'
                }
            });

            // 1. Intentar reproducir el tono de audio
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play()
                    .then(() => {
                        // El audio está sonando. Cuando termine, el evento onEnded disparará la voz.
                        console.log('🔊 Tono de audio iniciado...');
                    })
                    .catch(e => {
                        console.warn('Bloqueo de audio, disparando voz directamente:', e);
                        hablarCita(data);
                    });
            } else {
                hablarCita(data);
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

    return (
        <audio 
            ref={audioRef} 
            src="/assets/audio/tono_whatsapp_grupo.mp3" 
            preload="auto"
            onEnded={() => {
                if (lastDataRef.current) {
                    hablarCita(lastDataRef.current);
                }
            }}
        />
    );
}
