import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loyaltyService, clienteAuthService } from '../services/api';
import Icon from '../components/Icon';
import './ClienteLoginPage.css';

export default function ClaimPointPage() {
    const { token } = useParams();
    const { user, loginCliente } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading | needsLogin | claiming | success | error
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    // Login fields
    const [telefono, setTelefono] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    useEffect(() => {
        if (user && user.rol === 'Cliente') {
            claimPoint();
        } else if (!user) {
            setStatus('needsLogin');
        } else {
            // Logged in but not as cliente
            setStatus('error');
            setError('Inicia sesión como cliente para reclamar tu sello');
        }
    }, [user]);

    async function claimPoint() {
        setStatus('claiming');
        try {
            const res = await loyaltyService.claim(token);
            setResult(res.data);
            setStatus('success');
        } catch (err) {
            const data = err.response?.data;
            setStatus('error');
            if (data?.expired) {
                setError('Este QR ya expiró ⏰\nPide uno nuevo en tu próxima visita');
            } else if (data?.already_used) {
                setError('Este QR ya fue canjeado ✅\nSolo se puede usar una vez');
            } else {
                setError(data?.error || 'Error al reclamar sello');
            }
        }
    }

    function formatPhone(value) {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    async function handleLogin(e) {
        e.preventDefault();
        setLoginLoading(true);
        setError('');
        try {
            const digits = telefono.replace(/\D/g, '');
            await loginCliente(digits, undefined, password);
            // After login, useEffect will trigger claimPoint
        } catch (err) {
            setError(err.response?.data?.error || 'Error de conexión');
        } finally {
            setLoginLoading(false);
        }
    }

    // Loading
    if (status === 'loading' || status === 'claiming') {
        return (
            <div className="cliente-login-page">
                <div className="cliente-login-card" style={{ textAlign: 'center' }}>
                    <div className="cliente-login-logo">
                        <div className="logo-ring">
                            <Icon name="scissors" size={36} color="#c9a227" />
                        </div>
                        <h1>The Gangsta</h1>
                        <p className="tagline">Barber Shop</p>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <div className="cliente-spinner"></div>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>
                            {status === 'claiming' ? 'Reclamando tu sello...' : 'Verificando...'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Success!! 🎉
    if (status === 'success') {
        const puntos = result?.puntos || 0;
        const paraPremio = result?.puntos_para_regalo || (10 - (puntos % 10));
        return (
            <div className="cliente-login-page">
                <div className="cliente-login-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🎉</div>
                    <h2 style={{ color: '#c9a227', marginBottom: '0.5rem' }}>¡Sello Reclamado!</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Ahora tienes <strong style={{ color: '#c9a227' }}>{puntos} sellos</strong>
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '2rem' }}>
                        {paraPremio > 0
                            ? `Estás a ${paraPremio} corte${paraPremio > 1 ? 's' : ''} de tu regalo 🎁`
                            : '¡Tienes un corte gratis! 🎁'
                        }
                    </p>
                    <button
                        className="cliente-submit-btn"
                        onClick={() => navigate('/mi-perfil/portal')}
                    >
                        Ver Mi Tarjeta 💈
                    </button>
                </div>
            </div>
        );
    }

    // Error
    if (status === 'error' && !error.includes('Inicia sesión')) {
        return (
            <div className="cliente-login-page">
                <div className="cliente-login-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                        {error.includes('expiró') ? '⏰' : error.includes('canjeado') ? '✅' : '❌'}
                    </div>
                    <h2 style={{ color: error.includes('canjeado') ? '#c9a227' : '#ff6b6b', marginBottom: '0.5rem' }}>
                        {error.includes('canjeado') ? 'Ya canjeado' : 'No disponible'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-line', marginBottom: '2rem' }}>
                        {error}
                    </p>
                    <button
                        className="cliente-submit-btn"
                        onClick={() => navigate('/mi-perfil/portal')}
                    >
                        Ir a Mi Tarjeta
                    </button>
                </div>
            </div>
        );
    }

    // Needs Login
    return (
        <div className="cliente-login-page">
            <div className="cliente-login-card">
                <div className="cliente-login-logo">
                    <div className="logo-ring">
                        <Icon name="scissors" size={36} color="#c9a227" />
                    </div>
                    <h1>The Gangsta</h1>
                    <p className="tagline">Barber Shop</p>
                </div>

                <div className="cliente-login-welcome">
                    <h2>💈 ¡Tu sello te espera!</h2>
                    <p>Inicia sesión para reclamar tu punto</p>
                </div>

                {error && (
                    <div className="cliente-login-error">
                        <Icon name="alert-circle" size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="cliente-login-form">
                    <div className="cliente-input-group">
                        <div className="cliente-input-icon">📱</div>
                        <input
                            type="tel"
                            className="cliente-input"
                            placeholder="55-1234-5678"
                            value={telefono}
                            onChange={(e) => setTelefono(formatPhone(e.target.value))}
                            required
                            autoFocus
                            inputMode="numeric"
                        />
                    </div>
                    <div className="cliente-input-group">
                        <div className="cliente-input-icon">🔒</div>
                        <input
                            type="password"
                            className="cliente-input"
                            placeholder="Tu contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={4}
                        />
                    </div>
                    <button type="submit" className="cliente-submit-btn" disabled={loginLoading}>
                        {loginLoading ? <div className="cliente-spinner"></div> : 'Reclamar Mi Sello 🎁'}
                    </button>
                </form>

                <p className="cliente-login-footer">
                    ¿No tienes cuenta? <a href="/mi-perfil" style={{ color: '#c9a227' }}>Regístrate aquí</a>
                </p>
            </div>
        </div>
    );
}
