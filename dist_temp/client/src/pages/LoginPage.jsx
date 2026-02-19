import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import './LoginPage.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al iniciar sesión');
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
                            <Icon name="scissors" size={40} color="#c9a227" />
                        </div>
                        <h1 className="login-title">The Gangsta</h1>
                        <p className="login-subtitle">Barber Shop</p>
                    </div>

                    {/* Welcome Message */}
                    <div className="login-welcome">
                        <h2>Bienvenido de Nuevo</h2>
                        <p>Ingresa tus credenciales para acceder al sistema</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="login-error">
                            <Icon name="alert-circle" size={18} color="#dc2626" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Email Input */}
                        <div className="login-input-group">
                            <div className="login-input-icon">
                                <Icon name="mail" size={20} color="#6b7280" />
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
                                <Icon name="lock" size={20} color="#6b7280" />
                            </div>
                            <input
                                type="password"
                                className="login-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
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
                                <span>Iniciar Sesión</span>
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="login-demo">
                        <p className="demo-title">Credenciales de prueba:</p>
                        <p className="demo-text">admin@barberia.com / admin123</p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Visual Content */}
            <div className="login-right-panel">
                <div className="login-animated-bg"></div>
                <div className="login-right-content">
                    <div className="login-barber-pattern"></div>

                    <div className="login-hero">
                        <h2 className="hero-title">Gestiona tu negocio como un profesional</h2>
                        <p className="hero-description">
                            Sistema completo de gestión para tu barbería.
                            Control total de ventas, inventario, personal y más.
                        </p>

                        <div className="hero-features">
                            <div className="feature-item">
                                <Icon name="check-circle" size={24} color="#c9a227" />
                                <span>Punto de Venta Integrado</span>
                            </div>
                            <div className="feature-item">
                                <Icon name="check-circle" size={24} color="#c9a227" />
                                <span>Control de Inventario</span>
                            </div>
                            <div className="feature-item">
                                <Icon name="check-circle" size={24} color="#c9a227" />
                                <span>Reportes en Tiempo Real</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
