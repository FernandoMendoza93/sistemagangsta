import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { loyaltyService } from '../services/api';
import { toast } from 'sonner';
import { QrCode, ArrowLeft, RefreshCw, User, Star, Gift, Clock, LogOut, Stamp, CheckCircle, Camera, Barcode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ScannerLogic } from '../utils/ScannerLogic';
import { escanerService } from '../services/api';
import './ScannerPage.css';

export default function ScannerPage() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [scanData, setScanData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanActive, setScanActive] = useState(true);
    const [scanMessage, setScanMessage] = useState('');
    const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'hardware'

    // Efecto para invocar dinámicamente la clase ScannerLogic si es seleccionado
    useEffect(() => {
        let scanner = null;
        if (scanMode === 'hardware' && !scanData && scanActive) {

            // Instanciar listener global. Por defecto el threshold es agresivo (35ms)
            scanner = new ScannerLogic({
                onScan: async (code) => {
                    // El hardware interceptó una ráfaga. Mapeamos exactamente igual a la cámara
                    handleScan([{ rawValue: code }]);
                },
                onError: (err) => console.log('Ruido ignorado por Hardware Scanner: ', err)
            });

            // Opcional: Podrías hacer fetch a escanerService.getConfig() aquí y configurar dinámicamente
            // pero el config por defecto es robusto.
            scanner.start();
        }

        return () => {
            if (scanner) scanner.stop();
        };
    }, [scanMode, scanData, scanActive]);

    const handleScan = async (detectedCodes) => {
        if (!detectedCodes || detectedCodes.length === 0 || !scanActive) return;

        const token = detectedCodes[0].rawValue;
        setScanActive(false); // Stop scanning momentarily
        setLoading(true);

        try {
            const res = await loyaltyService.scan(token);
            setScanData(res.data);
            setScanMessage(res.data.message);

            if (res.data.action === 'ADDED') {
                if (res.data.lealtad.recompensa_disponible) {
                    toast.success('🎁 ¡10 sellos alcanzados en 120 días! Recompensa desbloqueada');
                } else {
                    toast.success('¡Sello registrado hoy ✓!');
                }
            } else if (res.data.action === 'ALREADY_ADDED') {
                toast.info('El cliente ya había recibido un sello el día de hoy.');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo leer el código QR de este establecimiento.');
            setScanActive(true);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setScanData(null);
        setScanActive(true);
        setScanMessage('');
    };

    return (
        <div className="scanner-container">
            <header className="scanner-header">
                <button className="btn-back" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={24} />
                    <span>Volver</span>
                </button>
                <h2>Escáner The Gangsta</h2>
                <button className="btn-logout-icon" onClick={() => { logout(); navigate('/login'); }}>
                    <LogOut size={24} />
                </button>
            </header>

            <main className="scanner-main">
                {!scanData ? (
                    <div className="scanner-box">
                        <div className="scanner-instructions">
                            <QrCode size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                            <h3>Escanear Membresía</h3>
                            <p>Apunta la cámara al teléfono del cliente para leer su Wallet The Gangsta.</p>
                        </div>

                        <div className="camera-wrapper">
                            <div className="mode-toggle-wrapper">
                                <button
                                    className={`mode-btn ${scanMode === 'camera' ? 'active' : ''}`}
                                    onClick={() => setScanMode('camera')}
                                >
                                    <Camera size={18} />
                                    Cámara
                                </button>
                                <button
                                    className={`mode-btn ${scanMode === 'hardware' ? 'active' : ''}`}
                                    onClick={() => setScanMode('hardware')}
                                >
                                    <Barcode size={18} />
                                    Lector Físico
                                </button>
                            </div>

                            {scanMode === 'camera' ? (
                                scanActive && (
                                    <Scanner
                                        onScan={handleScan}
                                        onError={(e) => console.log('Camera error:', e)}
                                        constraints={{ facingMode: "environment" }}
                                        options={{
                                            delayBetweenScanAttempts: 1000,
                                            delayBetweenScanSuccess: 2000,
                                        }}
                                    />
                                )
                            ) : (
                                <div className="hardware-scanner-wait">
                                    <div className="hardware-pulse-icon">
                                        <Barcode size={32} color="var(--accent-primary)" />
                                    </div>
                                    <h4>Esperando hardware...</h4>
                                    <p>Pasa el láser sobre la membresía QR/Código de Barras de tu cliente de manera fluida.</p>
                                </div>
                            )}

                            {loading && (
                                <div className="camera-loading">
                                    <div className="spinner"></div>
                                    <p>Leyendo datos...</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="client-summary">
                        <div className="summary-card">
                            <div className="summary-header">
                                <div className="client-avatar">
                                    <User size={40} color="#9CA3AF" />
                                </div>
                                <div>
                                    <h3 className="client-name">{scanData.cliente.nombre}</h3>
                                    <p className="client-phone">{scanData.cliente.telefono || 'Sin teléfono'}</p>
                                </div>
                            </div>

                            <div className="summary-stats">
                                <div className="stat-box">
                                    <span className="stat-label">Citas en 120 días</span>
                                    <span className="stat-value">{scanData.lealtad?.totales_historico || 0}</span>
                                </div>
                                <div className="stat-box">
                                    <span className="stat-label">Progreso VIP</span>
                                    <span className="stat-value">{scanData.lealtad.sellos_actuales} / 10</span>
                                </div>
                            </div>

                            {scanData.lealtad.recompensa_disponible ? (
                                <div className="reward-alert" style={{ background: 'linear-gradient(135deg, rgba(201,162,39,0.2), rgba(201,162,39,0.05))', borderColor: '#c9a227' }}>
                                    <Gift size={24} color="#c9a227" />
                                    <div>
                                        <strong style={{ color: '#c9a227' }}>¡Corte de Cortesía!</strong>
                                        <p>El cliente ha cumplido 10 visitas en el periodo de 120 días.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="no-reward-alert">
                                    Aún no hay obsequios VIP disponibles.
                                </div>
                            )}

                            {scanData.cita_hoy && (
                                <div className="appointment-alert">
                                    <Clock size={20} color="var(--accent-primary)" />
                                    <div>
                                        <strong>Cita programada para hoy:</strong>
                                        <p>{scanData.cita_hoy.hora} hrs - {scanData.cita_hoy.nombre_servicio}</p>
                                    </div>
                                </div>
                            )}

                            <div className="summary-actions">
                                <button className="btn-stamp-done" disabled style={{ opacity: 1, backgroundColor: scanData.action === 'ADDED' ? 'var(--success, #2ea043)' : 'var(--bg-input, #30363d)' }}>
                                    <CheckCircle size={22} color={scanData.action === 'ADDED' ? '#fff' : 'var(--text-muted, #8b949e)'} />
                                    <span style={{ color: scanData.action === 'ADDED' ? '#fff' : 'var(--text-muted, #8b949e)' }}>
                                        {scanMessage || 'Sello registrado hoy ✓'}
                                    </span>
                                </button>

                                <button className="btn-primary" onClick={() => navigate('/citas')}>
                                    Ver Agenda Total
                                </button>
                                <button className="btn-secondary" onClick={handleReset}>
                                    <RefreshCw size={20} />
                                    Escanear otro cliente
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
