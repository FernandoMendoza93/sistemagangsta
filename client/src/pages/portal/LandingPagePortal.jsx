import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

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
                
                // Aplicar el tema de la barbería para que los colores coincidan
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
        <div className="landing-portal-container" style={{
            position: 'relative',
            height: '100vh',
            width: '100%',
            overflow: 'hidden',
            background: bgImage ? `url(${bgImage})` : 'var(--bg-main)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#fff', // Texto claro sobre overlay oscuro
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Overlay oscuro para legibilidad */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.65)',
                zIndex: 1
            }}></div>

            {/* Contenido */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem',
                textAlign: 'center'
            }}>
                {/* Logo */}
                {barberia.logo_url && (
                    <img 
                        src={barberia.logo_url} 
                        alt={barberia.nombre} 
                        style={{ 
                            width: '90px', 
                            height: '90px', 
                            borderRadius: '50%', 
                            objectFit: 'cover',
                            marginBottom: '1rem',
                            border: '3px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                        }} 
                    />
                )}

                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '2rem', opacity: 0.9, letterSpacing: '1px' }}>
                    {barberia.nombre.toUpperCase()}
                </h2>

                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.1 }}>
                    {barberia.landing_titulo || 'Bienvenido a nuestra barbería'}
                </h1>

                <p style={{ fontSize: '1.1rem', marginBottom: '3rem', opacity: 0.8, maxWidth: '320px', lineHeight: 1.5 }}>
                    {barberia.landing_descripcion || 'Agenda tu cita, acumula puntos y accede a beneficios exclusivos.'}
                </p>

                {/* Pasos fijos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '300px', marginBottom: '4rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 700, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.2)' }}>1</div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Escanea el código QR</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 700, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.2)' }}>2</div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Regístrate gratis</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 700, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.2)' }}>3</div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Acumula puntos por visita</span>
                    </div>
                </div>

                {/* Botón Comenzar */}
                <button 
                    onClick={() => navigate(`/portal/${slug}/acceso`)}
                    style={{
                        width: '100%',
                        maxWidth: '320px',
                        height: '60px',
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                        transition: 'transform 0.2s ease',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    Comenzar <span>→</span>
                </button>
            </div>
        </div>
    );
}
