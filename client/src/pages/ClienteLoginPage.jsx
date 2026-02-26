import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import './ClienteLoginPage.css';

export default function ClienteLoginPage() {
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState('phone'); // 'phone' | 'register' | 'setPassword'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginCliente, user } = useAuth();
    const navigate = useNavigate();

    // Si ya está logueado como cliente, ir al portal
    if (user && user.rol === 'Cliente') {
        navigate('/mi-perfil/portal', { replace: true });
        return null;
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
                step === 'register' ? nombre : undefined,
                password || undefined
            );
            navigate('/mi-perfil/portal');
        } catch (err) {
            const data = err.response?.data;
            if (data?.needsRegistration) {
                setStep('register');
                setPassword('');
                setError('');
            } else if (data?.needsPassword) {
                setStep('setPassword');
                setPassword('');
                setError('');
            } else {
                setError(data?.error || 'Error de conexión');
            }
        } finally {
            setLoading(false);
        }
    }

    const titles = {
        phone: '¿Qué onda? 💈',
        register: '¡Bienvenido!',
        setPassword: '🔒 Protege tu cuenta'
    };

    const subtitles = {
        phone: 'Ingresa tu número y contraseña',
        register: 'Regístrate para activar tu tarjeta',
        setPassword: 'Crea una contraseña para tu cuenta'
    };

    const buttonLabels = {
        phone: 'Entrar',
        register: '¡Crear Mi Cuenta!',
        setPassword: 'Guardar Contraseña'
    };

    return (
        <div className="cliente-login-page">
            <div className="cliente-login-card">
                {/* Logo */}
                <div className="cliente-login-logo">
                    <div className="logo-ring">
                        <Icon name="scissors" size={36} color="#c9a227" />
                    </div>
                    <h1>The Gangsta</h1>
                    <p className="tagline">Barber Shop</p>
                </div>

                {/* Welcome */}
                <div className="cliente-login-welcome">
                    <h2>{titles[step]}</h2>
                    <p>{subtitles[step]}</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="cliente-login-error">
                        <Icon name="alert-circle" size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="cliente-login-form">
                    {/* Phone Input */}
                    <div className="cliente-input-group">
                        <div className="cliente-input-icon">📱</div>
                        <input
                            type="tel"
                            className="cliente-input"
                            placeholder="55-1234-5678"
                            value={telefono}
                            onChange={(e) => setTelefono(formatPhone(e.target.value))}
                            required
                            autoFocus={step === 'phone'}
                            inputMode="numeric"
                            disabled={step !== 'phone'}
                        />
                    </div>

                    {/* Name Input (only for new registration) */}
                    {step === 'register' && (
                        <div className="cliente-input-group slide-in">
                            <div className="cliente-input-icon">👤</div>
                            <input
                                type="text"
                                className="cliente-input"
                                placeholder="Tu nombre"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Password Input */}
                    <div className="cliente-input-group slide-in">
                        <div className="cliente-input-icon">🔒</div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="cliente-input"
                            placeholder={step === 'register' || step === 'setPassword' ? 'Crea una contraseña' : 'Tu contraseña'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoFocus={step === 'setPassword'}
                            minLength={4}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            <Icon name={showPassword ? 'eye-slash' : 'eye'} size={18} />
                        </button>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="cliente-submit-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="cliente-spinner"></div>
                        ) : (
                            buttonLabels[step]
                        )}
                    </button>

                    {/* Back button if on register/setPassword step */}
                    {step !== 'phone' && (
                        <button
                            type="button"
                            className="cliente-back-btn"
                            onClick={() => { setStep('phone'); setPassword(''); setError(''); }}
                        >
                            ← Cambiar número
                        </button>
                    )}
                </form>

                {/* Footer */}
                <p className="cliente-login-footer">
                    Tu cuenta está protegida con contraseña 🔐
                </p>

                {/* Staff Login Link */}
                <a href="/login" className="staff-login-link" onClick={(e) => {
                    e.preventDefault();
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }}>
                    ¿Eres del staff? Ingresa aquí
                </a>
            </div>
        </div>
    );
}
