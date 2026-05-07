import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import './LandingPagePortal.css';

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

            {/* Contenido Principal */}
            <div className="landing-portal-content">
                <div className="landing-portal-top">
                    <div className="landing-logo-wrapper">
                        {barberia.logo_url ? (
                            <img src={barberia.logo_url} alt={barberia.nombre} />
                        ) : (
                            <span style={{ fontSize: '32px' }}>✂️</span>
                        )}
                    </div>
                    
                    <p className="landing-brand-tag">{barberia.nombre}</p>
                    
                    <h1 className="landing-headline">
                        {barberia.landing_titulo?.includes(',') 
                            ? <>{barberia.landing_titulo.split(',')[0]},<br /><span>{barberia.landing_titulo.split(',')[1]}</span></>
                            : barberia.landing_titulo || <>Tu barbería,<br /><span>tu experiencia</span></>
                        }
                    </h1>
                    
                    <p className="landing-subtext">
                        {barberia.landing_descripcion || 'Agenda tu cita, acumula puntos y accede a beneficios exclusivos.'}
                    </p>
                </div>

                {/* Pasos con Glassmorphism */}
                <div className="landing-steps">
                    <div className="landing-step">
                        <div className="landing-step-num">1</div>
                        <div className="landing-step-info">
                            <span className="landing-step-title">Escanea el código QR</span>
                            <span className="landing-step-desc">El que te dio tu barbero al terminar</span>
                        </div>
                    </div>
                    <div className="landing-step">
                        <div className="landing-step-num">2</div>
                        <div className="landing-step-info">
                            <span className="landing-step-title">Regístrate gratis</span>
                            <span className="landing-step-desc">Solo tu teléfono y una contraseña</span>
                        </div>
                    </div>
                    <div className="landing-step">
                        <div className="landing-step-num">3</div>
                        <div className="landing-step-info">
                            <span className="landing-step-title">Acumula puntos</span>
                            <span className="landing-step-desc">Cada corte te acerca a tu recompensa</span>
                        </div>
                    </div>
                </div>

                {/* Botones Anclados al Fondo */}
                <div className="landing-portal-bottom">
                    <button 
                        className="btn-landing-primary"
                        onClick={() => navigate(`/portal/${slug}/registro`)}
                    >
                        Comenzar <span>→</span>
                    </button>
                    
                    <button 
                        className="btn-landing-secondary"
                        onClick={() => navigate(`/portal/${slug}/acceso`)}
                    >
                        Ya tengo cuenta — Iniciar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
