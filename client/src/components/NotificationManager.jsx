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
            console.log('🗣️ Iniciando síntesis de voz femenina (Pitch 1.6)...');
            
            // Cancelar cualquier voz pendiente para limpiar el canal
            window.speechSynthesis.cancel();

            const mensaje = new SpeechSynthesisUtterance();
            mensaje.text = `Atención. Tienes una nueva cita de ${data.cliente} a las ${data.hora}. Repito, cita de ${data.cliente} a las ${data.hora}.`;
            mensaje.lang = 'es-MX';
            mensaje.rate = 1.5;    // Un poco más rápido para mayor fluidez
            mensaje.pitch = 1.6;   // Pitch forzado a nivel femenino
            mensaje.volume = 1.0;  // Volumen máximo nativo

            mensaje.onend = () => {
                isSpeakingRef.current = false;
                lastDataRef.current = null;
            };

            // Selección agresiva de voz femenina (Sabina en PC, Paulina/Monica en iOS)
            const voices = window.speechSynthesis.getVoices();
            
            const femaleVoice = voices.find(v => 
                v.name.toLowerCase().includes('sabina') || 
                v.name.toLowerCase().includes('helena') ||
                v.name.toLowerCase().includes('paulina') ||
                v.name.toLowerCase().includes('zira') ||
                v.name.toLowerCase().includes('monica') ||
                v.name.toLowerCase().includes('siri') ||
                v.name.toLowerCase().includes('samantha')
            ) || voices.find(v => 
                (v.lang.toLowerCase().includes('es')) && 
                (
                    v.name.toLowerCase().includes('lucia') ||
                    v.name.toLowerCase().includes('natural') ||
                    v.name.toLowerCase().includes('female') ||
                    v.name.toLowerCase().includes('google español')
                )
            );
            
            if (femaleVoice) {
                console.log('✅ Voz seleccionada:', femaleVoice.name);
                mensaje.voice = femaleVoice;
            } else {
                console.warn('⚠️ No se encontró voz femenina específica, usando predeterminada con pitch alto');
            }

            window.speechSynthesis.speak(mensaje);
        } catch (error) {
            console.warn('⚠️ Error en síntesis de voz:', error);
            isSpeakingRef.current = false;
        }
    };

    useEffect(() => {
        console.log('🚀 NotificationManager v1.1.0 - Secuencia Audio+Voz Cargada');
        
        const logVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                console.log('🎤 Voces disponibles en este sistema:', voices.map(v => v.name));
            }
        };

        logVoices();
        window.speechSynthesis.onvoiceschanged = logVoices;

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

            // Lógica de reproducción SIMULTÁNEA
            if (audioRef.current) {
                console.log('🎵 Reproduciendo audio (vol 0.5) y voz (vol 1.0) al mismo tiempo...');
                audioRef.current.currentTime = 0;
                audioRef.current.volume = 0.5; // Bajamos el tono para que la voz resalte
                audioRef.current.play().catch(e => {
                    if (e.name === 'NotAllowedError') {
                        console.warn('🔇 Audio bloqueado por el navegador. Se requiere interacción.');
                        toast.error('Haz clic en la página para activar el sonido de las notificaciones');
                    } else {
                        console.error('❌ Error de audio:', e);
                    }
                });
            }
            
            // Disparar voz inmediatamente (a veces la voz sí funciona aunque el audio falle)
            hablarCita(data);
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
            src={`/assets/audio/tono_whatsapp_grupo.mp3?v=${Date.now()}`} 
            preload="auto"
            onError={(e) => console.error('🔴 Error crítico cargando archivo de audio:', e)}
        />
    );
}
