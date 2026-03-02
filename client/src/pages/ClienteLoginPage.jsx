import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone, Lock, User, Eye, EyeOff, Scissors, AlertCircle } from 'lucide-react';
import './ClienteLoginPage.css';

export default function ClienteLoginPage() {
    const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginCliente, user } = useAuth();
    const navigate = useNavigate();

    // Si ya está logueado como cliente, ir al portal
    if (user && user.rol === 'Cliente') {
        return <Navigate to="/mi-perfil/portal" replace />;
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
                password
            );
            navigate('/mi-perfil/portal');
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

    return (
        <div className="cliente-login-page">
            <div className="cliente-login-card fade-in-on-load">
                {/* Logo */}
                <div className="cliente-login-logo">
                    <div className="logo-ring">
                        <Scissors size={40} color="#FF6B4A" strokeWidth={1} />
                    </div>
                    <h1>Gangsta Barbershop</h1>
                    <p className="tagline">Barber Shop</p>
                </div>

                {/* Tabs */}
                <div className="cliente-tabs">
                    <button
                        className={`cliente-tab ${activeTab === 'login' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('login'); setError(''); }}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        className={`cliente-tab ${activeTab === 'register' ? 'active' : ''}`}
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
                    {/* Name Input (only for new registration) */}
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

                    {/* Phone Input */}
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

                    {/* Password Input */}
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

                    {/* Submit */}
                    <button
                        type="submit"
                        className="cliente-submit-btn"
                        disabled={loading}
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
