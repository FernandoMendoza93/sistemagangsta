import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loyaltyService, clienteAuthService } from '../services/api';
import Icon from '../components/Icon';
import { Scanner } from '@yudiel/react-qr-scanner';
import './ClienteLoginPage.css';

export default function ClaimPointPage() {
    // Si viene en la URL, se procesa directo
    const { token: urlToken } = useParams();

    // Estados principales
    const { user, loginCliente } = useAuth();
    const navigate = useNavigate();
    // scanner | loading | needsLogin | claiming | success | error
    const [status, setStatus] = useState('loading');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // Login fields
    const [telefono, setTelefono] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // Si pasaron el token por props internamente (después de escanear)
    const [scannedToken, setScannedToken] = useState(urlToken || null);

    useEffect(() => {
        // Validación del flujo inicial
        if (user && user.rol === 'Cliente') {
            if (scannedToken) {
                // Hay sesión y hay token -> A reclamar
                claimPoint(scannedToken);
            } else {
                // Hay sesión pero NO hay token -> Mostrar escáner
                setStatus('scanner');
            }
        } else if (!user) {
            // No hay sesión -> Mostrar login
            setStatus('needsLogin');
        } else {
            // Sesión de staff -> Error (no pueden reclamar sellos)
            setStatus('error');
            setError('Inicia sesión como cliente para reclamar tu sello');
        }
    }, [user, scannedToken]);

    async function claimPoint(tokenToClaim) {
        setStatus('claiming');
        try {
            const res = await loyaltyService.claim(tokenToClaim);
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

    const handleScan = (detectedCodes) => {
        if (detectedCodes && detectedCodes.length > 0) {
            const qrValue = detectedCodes[0].rawValue;

            // Extraer token de la URL si es que escaneó una ruta completa
            // Ej: "http://localhost:5173/mi-perfil/sello/TOKEN_AQUI"
            const match = qrValue.match(/\/sello\/(.+)$/);

            if (match && match[1]) {
                setScannedToken(match[1]); // Dispara el useEffect que llama a claimPoint
            } else {
                // Si el QR no tiene formato válido /sello/token, tratarlo directo o tirar error
                setScannedToken(qrValue);
            }
        }
    };

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
            // After login, useEffect will trigger either scanner or claimPoint based on scannedToken
        } catch (err) {
            setError(err.response?.data?.error || 'Error de conexión');
        } finally {
            setLoginLoading(false);
        }
    }

    // ==========================================
    // VISTAS DEL COMPONENTE
    // ==========================================

    // Loading / Claiming
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

    // Scanner
    if (status === 'scanner') {
        return (
            <div className="cliente-login-page">
                <div className="cliente-login-card" style={{ textAlign: 'center' }}>
                    <h2 style={{ color: '#c9a227', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Escanea el Código QR</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Apunta la cámara al QR que te muestra el barbero.
                    </p>

                    <div style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '2px solid rgba(201, 162, 39, 0.3)',
                        backgroundColor: '#000',
                        marginBottom: '1.5rem'
                    }}>
                        <Scanner
                            onScan={handleScan}
                            formats={['qr_code']}
                            components={{
                                audio: false,
                                finder: true,
                            }}
                        />
                    </div>

                    <button
                        className="btn btn-outline-secondary w-100"
                        style={{ borderRadius: '12px', padding: '0.75rem', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                        onClick={() => navigate('/mi-perfil/portal')}
                    >
                        Cancelar y volver al menú
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

                    {/* Boton para intentar escanear otro si hubo error */}
                    <button
                        className="cliente-submit-btn"
                        style={{ marginBottom: '1rem' }}
                        onClick={() => { setScannedToken(null); setStatus('scanner'); setError(''); }}
                    >
                        <Icon name="qr-code-scan" className="me-2" /> Escanear otro código
                    </button>

                    <button
                        className="btn btn-outline-secondary w-100"
                        style={{ borderRadius: '12px', padding: '0.75rem', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
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
                    <p>Inicia sesión para poder registrar tu punto.</p>
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
                        {loginLoading ? <div className="cliente-spinner"></div> : 'Entrar para Reclamar 🎁'}
                    </button>
                </form>

                <p className="cliente-login-footer">
                    ¿No tienes cuenta? <a href="/mi-perfil" style={{ color: '#c9a227' }}>Regístrate aquí</a>
                </p>
            </div>
        </div>
    );
}
