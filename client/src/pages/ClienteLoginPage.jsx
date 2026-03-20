import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { publicService } from '../services/api';
import { Phone, Lock, User, Eye, EyeOff, Scissors, AlertCircle, Store } from 'lucide-react';
import './ClienteLoginPage.css';

const THEMES = {
   menta_limpia: { bg_main: '#F0F9F6', bg_surface: '#FFFFFF', accent_primary: '#10B981', accent_secondary: '#34D399', text_main: '#064E3B', text_muted: '#6EE7B7' },
   oro_industrial: { bg_main: '#1A1A1A', bg_surface: '#2D2D2D', accent_primary: '#D4AF37', accent_secondary: '#F1C40F', text_main: '#FFFFFF', text_muted: '#A0A0A0' },
   noche_urbana: { bg_main: '#0F172A', bg_surface: '#1E293B', accent_primary: '#6366F1', accent_secondary: '#818CF8', text_main: '#F8FAFC', text_muted: '#94A3B8' },
   cuero_natural: { bg_main: '#FAFAF9', bg_surface: '#FFFFFF', accent_primary: '#9A3412', accent_secondary: '#C2410C', text_main: '#1C1917', text_muted: '#A8A29E' },
   classic_barber: { bg_main: '#FAFAF9', bg_surface: '#FFFFFF', accent_primary: '#DC2626', accent_secondary: '#EF4444', text_main: '#1C1917', text_muted: '#78716C' },
};

export default function ClienteLoginPage() {
    const { slug } = useParams();
    const [activeTab, setActiveTab] = useState('login');
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Barbería dinámica
    const [barberia, setBarberia] = useState(null);
    const [barberiaLoading, setBarberiaLoading] = useState(true);
    const [barberiaError, setBarberiaError] = useState(null);

    const { loginCliente, user } = useAuth();
    const { applyTheme, resetTheme } = useTheme();
    const navigate = useNavigate();

    // Cargar info de barbería al montar
    useEffect(() => {
        if (!slug) {
            setBarberiaError('URL inválida. Escanea el código QR de tu barbería.');
            setBarberiaLoading(false);
            return;
        }

        publicService.getConfig(slug)
            .then(res => {
                setBarberia(res.data);
                if (res.data.theme && THEMES[res.data.theme]) {
                    applyTheme(THEMES[res.data.theme], res.data.barberia_id);
                } else {
                    resetTheme();
                }
            })
            .catch(err => {
                if (err.response?.status === 404) {
                    setBarberiaError('Esta barbería no existe. Verifica el enlace o escanea el QR nuevamente.');
                } else if (err.response?.status === 403) {
                    setBarberiaError('Esta barbería está inactiva por el momento. Contacta a tu barbero.');
                } else {
                    setBarberiaError('No pudimos cargar la información. Intenta de nuevo en un momento.');
                }
            })
            .finally(() => setBarberiaLoading(false));
    }, [slug]);

    // Si ya está logueado como cliente, ir al portal de su barbería
    if (user && user.rol === 'Cliente') {
        return <Navigate to={`/portal/${slug}/panel`} replace />;
    }

    function formatPhone(value) {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const digits = telefono.replace(/\D/g, '');
        if (digits.length < 10) {
            setError('Ingresa tu número a 10 dígitos');
            setLoading(false);
            return;
        }

        try {
            await loginCliente(
                digits,
                activeTab === 'register' ? nombre : undefined,
                password,
                slug
            );
            navigate(`/portal/${slug}/panel`);
        } catch (err) {
            const data = err.response?.data;
            if (data?.needsRegistration) {
                if (activeTab === 'login') {
                    setError('No encontramos tu cuenta. Por favor regístrate primero.');
                    setActiveTab('register');
                } else {
                    setError(data?.error || 'Error de conexión');
                }
            } else {
                setError(data?.error || 'Error de conexión');
            }
        } finally {
            setLoading(false);
        }
    }

    // Estado de carga de barbería
    if (barberiaLoading) {
        return (
            <div className="cliente-login-page">
                <div className="cliente-login-card fade-in-on-load" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <div className="cliente-spinner" style={{ margin: '0 auto 1.5rem' }}></div>
                    <p style={{ color: 'var(--text-secondary)' }}>Cargando portal...</p>
                </div>
            </div>
        );
    }

    // Estado de error de barbería
    if (barberiaError) {
        return (
            <div className="cliente-login-page">
                <div className="cliente-login-card fade-in-on-load" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <div className="logo-ring" style={{ margin: '0 auto 1.5rem', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,107,74,0.12)', border: '2px solid rgba(255,107,74,0.3)' }}>
                        <Store size={36} color="var(--accent-primary, #FF6B4A)" strokeWidth={1.5} />
                    </div>
                    <h2 style={{ color: 'var(--text-main)', marginBottom: '0.75rem', fontSize: '1.25rem' }}>Portal no disponible</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{barberiaError}</p>
                </div>
            </div>
        );
    }

    // Color dinámico de la barbería
    const acento = barberia?.color_acento || '#FF6B4A';

    return (
        <div className="cliente-login-page">
            <div className="cliente-login-card fade-in-on-load" style={{ '--color-acento': acento }}>
                {/* Logo dinámico */}
                <div className="cliente-login-logo">
                    {barberia?.logo_url ? (
                        <div className="logo-ring" style={{ borderColor: `${acento}50`, background: `${acento}15`, padding: '6px', overflow: 'hidden' }}>
                            <img
                                src={barberia.logo_url}
                                alt={barberia.nombre}
                                style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: '50%' }}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                            />
                            <div style={{ display: 'none' }}>
                                <Store size={40} color={acento} strokeWidth={1} />
                            </div>
                        </div>
                    ) : (
                        <div className="logo-ring" style={{ borderColor: `${acento}50`, background: `${acento}15` }}>
                            <Scissors size={40} color={acento} strokeWidth={1} />
                        </div>
                    )}
                    <h1 style={{ color: 'var(--text-main)' }}>{barberia?.nombre}</h1>
                    <p className="tagline">Portal de Clientes</p>
                </div>

                {/* Tabs */}
                <div className="cliente-tabs">
                    <button
                        className={`cliente-tab ${activeTab === 'login' ? 'active' : ''}`}
                        style={activeTab === 'login' ? { borderBottomColor: acento, color: acento } : {}}
                        onClick={() => { setActiveTab('login'); setError(''); }}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        className={`cliente-tab ${activeTab === 'register' ? 'active' : ''}`}
                        style={activeTab === 'register' ? { borderBottomColor: acento, color: acento } : {}}
                        onClick={() => { setActiveTab('register'); setError(''); }}
                    >
                        Registrarme
                    </button>
                </div>

                {/* Welcome */}
                <div className="cliente-login-welcome">
                    {activeTab === 'login' ? (
                        <p>Ingresa para ver tus puntos y citas</p>
                    ) : (
                        <p>Regístrate para activar tu tarjeta de lealtad</p>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="cliente-login-error">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="cliente-login-form">
                    {activeTab === 'register' && (
                        <div className="cliente-input-group slide-in">
                            <div className="cliente-input-icon"><User size={20} strokeWidth={1.5} /></div>
                            <input
                                type="text"
                                className="cliente-input"
                                placeholder="Tu nombre y apellido"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required={activeTab === 'register'}
                            />
                        </div>
                    )}

                    <div className="cliente-input-group">
                        <div className="cliente-input-icon"><Phone size={20} strokeWidth={1.5} /></div>
                        <input
                            type="tel"
                            className="cliente-input"
                            placeholder="Teléfono (10 dígitos)"
                            value={telefono}
                            onChange={(e) => setTelefono(formatPhone(e.target.value))}
                            required
                            inputMode="numeric"
                        />
                    </div>

                    <div className="cliente-input-group">
                        <div className="cliente-input-icon"><Lock size={20} strokeWidth={1.5} /></div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="cliente-input"
                            placeholder={activeTab === 'register' ? 'Crea una contraseña' : 'Tu contraseña'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={4}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                        </button>
                    </div>

                    {activeTab === 'login' && (
                        <p className="login-hint">
                            Si eres cliente antiguo, ingresa tu número y crea una contraseña nueva en este espacio.
                        </p>
                    )}

                    <button
                        type="submit"
                        className="cliente-submit-btn"
                        disabled={loading}
                        style={{ background: `linear-gradient(135deg, ${acento}, ${acento}cc)` }}
                    >
                        {loading ? (
                            <div className="cliente-spinner"></div>
                        ) : (
                            activeTab === 'login' ? 'Entrar al Portal' : 'Crear Mi Cuenta'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
