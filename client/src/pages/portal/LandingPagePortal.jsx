import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';
import './LandingPagePortal.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1, 
        transition: { 
            staggerChildren: 0.15,
            delayChildren: 0.1
        } 
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
};

export default function LandingPagePortal() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { applyTheme } = useTheme();
    const [barberia, setBarberia] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchBarberia = async () => {
            try {
                const res = await authService.getBarberiaInfo(slug);
                setBarberia(res.data);
                
                if (res.data.tema) {
                    applyTheme(res.data.tema, res.data.id);
                }
            } catch (err) {
                console.error('Error cargando barbería:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchBarberia();
    }, [slug, applyTheme]);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    if (error || !barberia) {
        return (
            <div className="error-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-main)', color: 'var(--text-main)', textAlign: 'center', padding: '2rem' }}>
                <h1 style={{ fontSize: '4rem', margin: 0 }}>404</h1>
                <p style={{ fontSize: '1.2rem', opacity: 0.7 }}>Barbería no encontrada</p>
                <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '2rem' }}>Ir al inicio</button>
            </div>
        );
    }

    const bgImage = barberia.landing_imagen_fondo;
    
    return (
        <div className="landing-portal-container">
            {/* Fondo con Gradiente Inteligente */}
            <div 
                className="landing-portal-bg" 
                style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none' }}
            >
                <div className="landing-portal-overlay"></div>
            </div>

            {/* Contenido Principal Animado */}
            <motion.div 
                className="landing-portal-content"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="landing-portal-top">
                    <motion.div variants={itemVariants} className="landing-logo-wrapper">
                        {barberia.logo_url ? (
                            <img src={barberia.logo_url} alt={barberia.nombre} />
                        ) : (
                            <span style={{ fontSize: '32px' }}>✂️</span>
                        )}
                    </motion.div>
                    
                    <motion.p variants={itemVariants} className="landing-brand-tag">
                        {barberia.nombre}
                    </motion.p>
                    
                    <motion.h1 variants={itemVariants} className="landing-headline">
                        {barberia.landing_titulo?.includes(',') 
                            ? <>{barberia.landing_titulo.split(',')[0]},<br /><span>{barberia.landing_titulo.split(',')[1]}</span></>
                            : barberia.landing_titulo || <>Bienvenido a nuestra<br /><span>barbería</span></>
                        }
                    </motion.h1>
                    
                    <motion.p variants={itemVariants} className="landing-subtext">
                        {barberia.landing_descripcion || 'Agenda tu cita, acumula puntos y accede a beneficios exclusivos. Si eres cliente nuevo regístrate, si ya tienes cuenta inicia sesión.'}
                    </motion.p>
                </div>

                {/* Pasos con Glassmorphism */}
                <div className="landing-steps">
                    <motion.div variants={itemVariants} className="landing-step glass-card" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="landing-step-num">1</div>
                        <div className="landing-step-info">
                            <span className="landing-step-title">Escanea el código QR</span>
                            <span className="landing-step-desc">El que te dio tu barbero al terminar</span>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants} className="landing-step glass-card" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="landing-step-num">2</div>
                        <div className="landing-step-info">
                            <span className="landing-step-title">Regístrate gratis</span>
                            <span className="landing-step-desc">Solo tu teléfono y una contraseña</span>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants} className="landing-step glass-card" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="landing-step-num">3</div>
                        <div className="landing-step-info">
                            <span className="landing-step-title">Acumula puntos</span>
                            <span className="landing-step-desc">Cada corte te acerca a tu recompensa</span>
                        </div>
                    </motion.div>
                </div>

                {/* Botones Anclados al Fondo */}
                <motion.div variants={itemVariants} className="landing-portal-bottom">
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-landing-primary pulse-btn"
                        onClick={() => navigate(`/portal/${slug}/registro`)}
                    >
                        Comenzar <span>→</span>
                    </motion.button>
                    
                    <button 
                        className="btn-landing-secondary"
                        onClick={() => navigate(`/portal/${slug}/acceso`)}
                    >
                        Ya tengo cuenta — Iniciar sesión
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}
