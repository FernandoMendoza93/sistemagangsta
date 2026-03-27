import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { initiateSocket, disconnectSocket, subscribeToEvent } from '../services/socket.js';
import { toast } from 'sonner';

export default function NotificationManager() {
    const { user } = useAuth();
    const audioRef = useRef(null);
    const lastDataRef = useRef(null);
    const isSpeakingRef = useRef(false);

    const hablarCita = (data) => {
        if (!data || isSpeakingRef.current) return;
        
        try {
            isSpeakingRef.current = true;
            console.log('🗣️ Iniciando síntesis de voz...');
            
            const mensaje = new SpeechSynthesisUtterance();
            mensaje.text = `Atención. Tienes una nueva cita de ${data.cliente} a las ${data.hora}. Repito, cita de ${data.cliente} a las ${data.hora}.`;
            mensaje.lang = 'es-MX';
            mensaje.rate = 1.4;
            mensaje.pitch = 1.3;

            mensaje.onend = () => {
                isSpeakingRef.current = false;
                lastDataRef.current = null;
            };

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
            isSpeakingRef.current = false;
        }
    };

    useEffect(() => {
        console.log('🚀 NotificationManager v1.1.0 - Secuencia Audio+Voz Cargada');
        if (!user || user.rol === 'Cliente') {
            disconnectSocket();
            return;
        }

        const socket = initiateSocket(user.barberia_id);

        subscribeToEvent('NUEVA_CITA', (data) => {
            console.log('🔔 EVENTO RECIBIDO:', data);
            lastDataRef.current = data;
            
            // Alerta Visual
            toast.success(`¡Nueva Cita! ${data.cliente} - ${data.hora}`, {
                description: `${data.servicio}`,
                duration: 10000, 
            });

            // Lógica de reproducción
            if (audioRef.current) {
                console.log('🎵 Intentando reproducir audio...');
                audioRef.current.currentTime = 0;
                
                audioRef.current.play()
                    .then(() => {
                        console.log('✅ Audio reproduciéndose correctamente');
                    })
                    .catch(e => {
                        console.error('❌ Error / Bloqueo de audio:', e.message);
                        // Si el audio falla (bloqueo por navegador o error de carga), saltamos a la voz
                        hablarCita(data);
                    });
            } else {
                console.warn('⚠️ Referencia de audio no disponible, saltando a voz');
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
            onError={(e) => console.error('🔴 Error crítico cargando archivo de audio:', e)}
            onEnded={() => {
                console.log('🏁 Audio finalizado, iniciando voz...');
                if (lastDataRef.current) {
                    hablarCita(lastDataRef.current);
                }
            }}
        />
    );
}
