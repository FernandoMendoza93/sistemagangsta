import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loyaltyService, clienteAuthService } from '../services/api';
import Icon from '../components/Icon';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Gift, AlertCircle, CheckCircle, Clock, XCircle, QrCode, Smartphone, Lock, Scissors } from 'lucide-react';
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
                setError('Este QR ha expirado.\nSolicita uno nuevo en tu próxima visita.');
            } else if (data?.already_used) {
                setError('Este QR ya fue canjeado.\nSolamente se puede usar una vez.');
            } else {
                setError(data?.error || 'Excepción al reclamar el sello.');
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
                            <Icon name="scissors" size={36} color="var(--accent-primary, #FF5F40)" />
                        </div>
                        <h1>The Gangsta</h1>
                        <p className="tagline">Barber Shop</p>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <div className="cliente-spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ color: 'var(--text-muted, #6B7280)', marginTop: '1rem', fontWeight: 500 }}>
                            {status === 'claiming' ? 'Verificando y reclamando sello...' : 'Cargando información...'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Success !!
    if (status === 'success') {
        const puntos = result?.puntos || 0;
        const paraPremio = result?.puntos_para_regalo || (10 - (puntos % 10));
        return (
            <div className="cliente-login-page">
                <div className="cliente-login-card" style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '50%' }}>
                            <CheckCircle size={64} color="#10B981" />
                        </div>
                    </div>
                    <h2 style={{ color: 'var(--text-main, #111827)', marginBottom: '0.5rem', fontWeight: 800 }}>¡Sello Reclamado!</h2>
                    <p style={{ color: 'var(--text-muted, #4B5563)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                        Ahora tienes <strong style={{ color: 'var(--accent-primary, #FF5F40)' }}>{puntos} sellos</strong> en total.
                    </p>
                    <p style={{ color: 'var(--text-muted, #6B7280)', fontSize: '0.9rem', marginBottom: '2rem', fontWeight: 500 }}>
                        {paraPremio > 0
                            ? `Estás a ${paraPremio} corte${paraPremio > 1 ? 's' : ''} de tu acceso VIP.`
                            : '¡Tienes un corte VIP disponible!'
                        }
                    </p>
                    <button
                        className="cliente-submit-btn"
                        onClick={() => navigate('/mi-perfil/portal')}
                        style={{ width: '100%' }}
                    >
                        Ver Mi Lealtad <Gift size={18} style={{ marginLeft: '8px' }} />
                    </button>
                </div>
            </div>
        );
    }

    // Scanner
    if (status === 'scanner') {
        return (
            <div className="cliente-login-page">
                <div className="cliente-login-card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(255, 95, 64, 0.1)', padding: '16px', borderRadius: '50%' }}>
                            <QrCode size={40} color="var(--accent-primary, #FF5F40)" />
                        </div>
                    </div>
                    <h2 style={{ color: 'var(--text-main, #111827)', marginBottom: '0.5rem', fontSize: '1.3rem', fontWeight: 800 }}>Escanea el Código QR</h2>
                    <p style={{ color: 'var(--text-muted, #6B7280)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Apunta la cámara al código que te muestra el barbero al terminar.
                    </p>

                    <div style={{
                        borderRadius: '20px',
                        overflow: 'hidden',
                        border: '3px solid var(--accent-primary, #FF5F40)',
                        backgroundColor: 'var(--bg-input, #F9FAFB)',
                        marginBottom: '1.5rem',
                        boxShadow: '0 10px 25px rgba(255,95,64,0.1)'
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
                        className="tab-btn"
                        style={{ width: '100%', background: 'var(--bg-input, #F3F4F6)', color: 'var(--text-muted, #4B5563)' }}
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
        const isUsed = error.includes('canjeado');
        const isExpired = error.includes('expirado');

        return (
            <div className="cliente-login-page">
                <div className="cliente-login-card" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: isUsed ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '50%' }}>
                            {isUsed ? <CheckCircle size={48} color="#F59E0B" /> : isExpired ? <Clock size={48} color="#EF4444" /> : <XCircle size={48} color="#EF4444" />}
                        </div>
                    </div>

                    <h2 style={{ color: 'var(--text-main, #111827)', marginBottom: '0.5rem', fontWeight: 800 }}>
                        {isUsed ? 'Código ya usado' : 'No disponible'}
                    </h2>

                    <p style={{ color: 'var(--text-muted, #6B7280)', whiteSpace: 'pre-line', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {error}
                    </p>

                    <button
                        className="cliente-submit-btn"
                        style={{ marginBottom: '1rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                        onClick={() => { setScannedToken(null); setStatus('scanner'); setError(''); }}
                    >
                        <QrCode size={18} /> Escanear nuevo código
                    </button>

                    <button
                        className="tab-btn"
                        style={{ width: '100%', background: 'var(--bg-input, #F3F4F6)', color: 'var(--text-muted, #4B5563)' }}
                        onClick={() => navigate('/mi-perfil/portal')}
                    >
                        Volver al Portal
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
                        <Icon name="scissors" size={36} color="var(--accent-primary, #FF5F40)" />
                    </div>
                    <h1>The Gangsta</h1>
                    <p className="tagline">Barber Shop</p>
                </div>

                <div className="cliente-welcome-section">
                    <h2><Scissors size={20} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--accent-primary, #FF5F40)' }} /> ¡Tu visita te espera!</h2>
                    <p>Inicia sesión primero para poder registrar tu asistencia.</p>
                </div>

                {error && (
                    <div className="cliente-login-error">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="cliente-login-form">
                    <div className="cliente-input-group">
                        <div className="cliente-input-icon"><Smartphone size={20} /></div>
                        <input
                            type="tel"
                            className="cliente-input"
                            placeholder="Teléfono"
                            value={telefono}
                            onChange={(e) => setTelefono(formatPhone(e.target.value))}
                            required
                            autoFocus
                            inputMode="numeric"
                        />
                    </div>
                    <div className="cliente-input-group">
                        <div className="cliente-input-icon"><Lock size={20} /></div>
                        <input
                            type="password"
                            className="cliente-input"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={4}
                        />
                    </div>
                    <button type="submit" className="cliente-submit-btn" disabled={loginLoading}>
                        {loginLoading ? <div className="cliente-spinner"></div> : 'Entrar para Registrar'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted, #6B7280)', fontSize: '0.9rem' }}>
                    ¿No tienes cuenta? <a href="/mi-perfil" style={{ color: 'var(--accent-primary, #FF5F40)', fontWeight: 600, textDecoration: 'none' }}>Regístrate aquí</a>
                </p>
            </div>
        </div>
    );
}
