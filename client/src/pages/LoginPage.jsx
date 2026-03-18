import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scissors, Mail, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/panel');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al iniciar sesion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Left Panel - Login Form */}
            <div className="login-left-panel">
                <div className="login-glass-card">
                    {/* Logo & Title */}
                    <div className="login-logo">
                        <div className="logo-icon">
                            <Scissors size={28} color="#FF6B4A" strokeWidth={1.5} />
                        </div>
                        <h1 className="login-title">Flow</h1>
                        <p className="login-subtitle">Barber Management</p>
                    </div>

                    {/* Welcome Message */}
                    <div className="login-welcome">
                        <h2>Acceso Staff</h2>
                        <p>Ingresa tus credenciales para acceder al panel</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="login-error">
                            <Lock size={16} color="#dc2626" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Email Input */}
                        <div className="login-input-group">
                            <div className="login-input-icon">
                                <Mail size={18} strokeWidth={1.5} />
                            </div>
                            <input
                                type="email"
                                className="login-input"
                                placeholder="correo@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="login-input-group">
                            <div className="login-input-icon">
                                <Lock size={18} strokeWidth={1.5} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="login-input"
                                placeholder="Tu contrasena"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="login-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="login-spinner"></div>
                                    <span>Ingresando...</span>
                                </>
                            ) : (
                                <span>Ingresar al Panel</span>
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="login-demo">
                        <p className="demo-title">Credenciales de prueba</p>
                        <p className="demo-text">admin@barberia.com / admin123</p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Visual Content */}
            <div className="login-right-panel">
                <div className="login-animated-bg"></div>
                <div className="login-right-content">
                    <h2 className="hero-title">Gestiona tu barberia como un profesional</h2>
                    <p className="hero-description">
                        Sistema completo de gestion para tu barberia.
                        Control total de ventas, inventario, personal y mas.
                    </p>

                    <div className="hero-features">
                        <div className="feature-item">
                            <CheckCircle size={22} color="#c9a227" strokeWidth={1.5} />
                            <span>Punto de Venta Integrado</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle size={22} color="#c9a227" strokeWidth={1.5} />
                            <span>Control de Inventario</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle size={22} color="#c9a227" strokeWidth={1.5} />
                            <span>Reportes en Tiempo Real</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
