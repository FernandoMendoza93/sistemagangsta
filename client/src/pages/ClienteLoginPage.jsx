import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { publicService } from '../services/api';
import { Phone, Lock, User, Eye, EyeOff, Scissors, AlertCircle, Store, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './ClienteLoginPage.css';

const PremiumTooltip = ({ text, visible, top, left, bottom, right, pointer = 'down' }) => (
    <AnimatePresence>
        {visible && (
            <motion.div
                initial={{ opacity: 0, y: pointer === 'down' ? -5 : 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    position: 'absolute',
                    top, left, bottom, right,
                    background: 'rgba(20, 20, 25, 0.75)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '12.5px',
                    fontWeight: '500',
                    letterSpacing: '0.2px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
                    zIndex: 20,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                {/* Indicador pulsante premium */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px' }}>
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--accent-primary, #6366f1)' }}
                    />
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-primary, #6366f1)', boxShadow: '0 0 8px var(--accent-primary, #6366f1)' }} />
                </div>
                
                <span style={{ opacity: 0.9 }}>{text}</span>
            </motion.div>
        )}
    </AnimatePresence>
);


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
    const [showTour, setShowTour] = useState(() => !localStorage.getItem('tourCompleted'));
    const [focusedField, setFocusedField] = useState(null);

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
                if (res.data.nombre) {
                    document.title = `${res.data.nombre} | Flow System`;
                }
                if (res.data.bg_main) {
                    applyTheme(res.data, res.data.barberia_id);
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
        return <Navigate to={`/portal/${slug}/portal`} replace />;
    }

    function formatPhone(value) {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (showTour) {
            setShowTour(false);
            localStorage.setItem('tourCompleted', 'true');
        }

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
            navigate(`/portal/${slug}/portal`);
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

    // Color dinámico: prefiere accent del tema, fallback a color_acento
    const acento = barberia?.accent_primary || barberia?.color_acento || '#FF6B4A';

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
                        <p>¿Ya tienes cuenta? Ingresa para ver tus citas y puntos de lealtad.</p>
                    ) : (
                        <p>Crea tu cuenta rápido y gratis para activar tu tarjeta de lealtad.</p>
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
                                onFocus={() => setFocusedField('nombre')}
                                onBlur={() => setFocusedField('null')}
                            />
                            <PremiumTooltip 
                                text="Empieza por escribir tu nombre" 
                                visible={showTour && focusedField !== 'nombre' && !nombre} 
                                top="-38px" left="12px" 
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
                                onFocus={() => setFocusedField('telefono')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <PremiumTooltip 
                                text="Tu número celular a 10 dígitos" 
                                visible={showTour && focusedField !== 'telefono' && !telefono && (activeTab === 'login' || (activeTab === 'register' && nombre))} 
                                top="-38px" left="12px" 
                            />
                    </div>

                    <div className="cliente-input-group">
                        <div className="cliente-input-icon"><Lock size={20} strokeWidth={1.5} /></div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="cliente-input"
                                placeholder={activeTab === 'register' ? 'Crea una contraseña fácil de recordar' : 'Tu contraseña'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={4}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <PremiumTooltip 
                                text={activeTab === 'register' ? "Crea una contraseña segura" : "Ingresa tu contraseña"} 
                                visible={showTour && focusedField !== 'password' && !password && telefono.length >= 10} 
                                top="-38px" left="12px" 
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
                        <p className="login-hint" style={{ fontWeight: '500', color: 'var(--accent-primary)', textAlign: 'center', fontSize: '0.9rem' }}>
                            💡 ¿No tienes cuenta? Toca en "Registrarme" arriba.
                        </p>
                    )}

                    <button
                        type="submit"
                        className="cliente-submit-btn"
                        disabled={loading}
                        style={{ background: `linear-gradient(135deg, var(--accent-primary), rgba(var(--accent-primary-rgb), 0.8))`, position: 'relative' }}
                    >
                        {loading ? (
                            <div className="cliente-spinner"></div>
                        ) : (
                            activeTab === 'login' ? 'Entrar al Portal' : 'Crear Mi Cuenta'
                        )}
                        <PremiumTooltip 
                            text="Toca aquí para continuar" 
                            visible={showTour && password.length >= 4 && telefono.length >= 10} 
                            top="110%" left="50%" right={undefined} bottom={undefined}
                            pointer="up"
                        />
                    </button>
                    {showTour && (
                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                            <button type="button" onClick={() => setShowTour(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', fontSize: '12px' }}>
                                Ocultar guías
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
