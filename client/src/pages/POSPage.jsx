import { useState, useEffect, useRef } from 'react';
import { serviciosService, productosService, barberosService, ventasService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import Icon from '../components/Icon';

export default function POSPage() {
    const { user } = useAuth();
    const [servicios, setServicios] = useState([]);
    const [productos, setProductos] = useState([]);
    const [barberos, setBarberos] = useState([]);
    const [cart, setCart] = useState([]);
    const [barberoId, setBarberoId] = useState('');
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState(null);
    const [tab, setTab] = useState('servicios');
    // QR Fidelidad
    const [qrData, setQrData] = useState(null);
    const [qrTimeLeft, setQrTimeLeft] = useState(0);
    const [ventaPendienteId, setVentaPendienteId] = useState(null);
    const qrTimerRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [servRes, prodRes, barbRes] = await Promise.all([
                serviciosService.getActivos(),
                productosService.getVenta(),
                barberosService.getActivos()
            ]);
            setServicios(servRes.data);
            setProductos(prodRes.data);
            setBarberos(barbRes.data);

            // Si el usuario es barbero, seleccionarlo automáticamente
            if (user?.barbero) {
                setBarberoId(user.barbero.id);
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item, tipo) => {
        const existingIndex = cart.findIndex(c =>
            (tipo === 'servicio' && c.id_servicio === item.id) ||
            (tipo === 'producto' && c.id_producto === item.id)
        );

        if (existingIndex >= 0) {
            const newCart = [...cart];
            newCart[existingIndex].cantidad += 1;
            newCart[existingIndex].subtotal = newCart[existingIndex].cantidad * newCart[existingIndex].precio_unitario;
            setCart(newCart);
        } else {
            setCart([...cart, {
                id_servicio: tipo === 'servicio' ? item.id : null,
                id_producto: tipo === 'producto' ? item.id : null,
                nombre: tipo === 'servicio' ? item.nombre_servicio : item.nombre,
                precio_unitario: tipo === 'servicio' ? item.precio : item.precio_venta,
                cantidad: 1,
                subtotal: tipo === 'servicio' ? item.precio : item.precio_venta,
                tipo
            }]);
        }
    };

    const removeFromCart = (index) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const updateQuantity = (index, delta) => {
        const newCart = [...cart];
        newCart[index].cantidad = Math.max(1, newCart[index].cantidad + delta);
        newCart[index].subtotal = newCart[index].cantidad * newCart[index].precio_unitario;
        setCart(newCart);
    };

    const getTotal = () => cart.reduce((sum, item) => sum + item.subtotal, 0);

    const handleVenta = async () => {
        if (cart.length === 0) {
            setMessage({ type: 'error', text: 'Agrega al menos un item' });
            return;
        }

        // Validar que se seleccione barbero si hay servicios
        const tieneServicios = cart.some(item => item.id_servicio);
        if (tieneServicios && !barberoId) {
            setMessage({ type: 'error', text: 'Selecciona un barbero para los servicios' });
            return;
        }

        setProcessing(true);
        try {
            const items = cart.map(item => ({
                id_servicio: item.id_servicio,
                id_producto: item.id_producto,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario
            }));

            const res = await ventasService.create({
                id_barbero: barberoId || null,
                metodo_pago: metodoPago,
                items
            });

            // Guardar el ID de la venta pendiente
            setVentaPendienteId(res.data.id);
            setMessage(null);
            setCart([]);

            // Mostrar QR de fidelidad
            if (res.data.qr_token) {
                const qrUrl = `${window.location.origin}/mi-perfil/sello/${res.data.qr_token}`;
                setQrData({ url: qrUrl, total: res.data.total });
                setQrTimeLeft(300); // 5 minutos
                if (qrTimerRef.current) clearInterval(qrTimerRef.current);
                qrTimerRef.current = setInterval(() => {
                    setQrTimeLeft(prev => {
                        if (prev <= 1) {
                            clearInterval(qrTimerRef.current);
                            // Auto-cancelar al expirar
                            cancelarVenta(res.data.id);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Error al registrar venta' });
        } finally {
            setProcessing(false);
        }
    };

    // Cancelar venta pendiente (cerrar QR sin confirmar)
    async function cancelarVenta(id) {
        const ventaId = id || ventaPendienteId;
        if (!ventaId) return;
        try {
            await ventasService.cancelar(ventaId);
            setMessage({ type: 'error', text: 'Venta cancelada — no se confirmó el QR ❌' });
        } catch (err) {
            console.error('Error cancelando venta:', err);
        }
        setQrData(null);
        setVentaPendienteId(null);
        if (qrTimerRef.current) clearInterval(qrTimerRef.current);
        loadData();
    }

    // Confirmar venta manualmente (sin QR)
    async function confirmarSinQR() {
        if (!ventaPendienteId) return;
        try {
            await ventasService.confirmar(ventaPendienteId);
            setMessage({ type: 'success', text: '¡Venta confirmada exitosamente! ✅' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Error confirmando venta' });
        }
        setQrData(null);
        setVentaPendienteId(null);
        if (qrTimerRef.current) clearInterval(qrTimerRef.current);
        loadData();
    }

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    const mainContent = (
        <div>
            <div className="page-header">
                <div className="header-title-wrapper">
                    <div className="title-icon">
                        <Icon name="shopping-cart" size={28} color="#2563eb" />
                    </div>
                    <h1 className="page-title">Punto de Venta</h1>
                </div>
            </div>

            {message && (
                <div className={`login-error`} style={{
                    background: message.type === 'success' ? 'rgba(46, 160, 67, 0.1)' : undefined,
                    borderColor: message.type === 'success' ? 'var(--success)' : undefined,
                    color: message.type === 'success' ? 'var(--success)' : undefined,
                    marginBottom: '1rem'
                }}>
                    {message.text}
                </div>
            )}

            <div className="pos-container">
                <div>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button
                            className={`btn ${tab === 'servicios' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setTab('servicios')}
                        >
                            <Icon name="clipboard" size={18} />
                            <span>Servicios</span>
                        </button>
                        <button
                            className={`btn ${tab === 'productos' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setTab('productos')}
                        >
                            <Icon name="package" size={18} />
                            <span>Productos</span>
                        </button>
                    </div>

                    {/* Grid de items */}
                    <div className="pos-services">
                        {tab === 'servicios' && servicios.map(s => (
                            <div key={s.id} className="service-card" onClick={() => addToCart(s, 'servicio')}>
                                <div className="service-name">{s.nombre_servicio}</div>
                                <div className="service-price">${s.precio.toFixed(2)}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Icon name="clock" size={14} color="#6b7280" />
                                    {s.duracion_aprox} min
                                </div>
                            </div>
                        ))}

                        {tab === 'productos' && productos.map(p => (
                            <div key={p.id} className="service-card" onClick={() => addToCart(p, 'producto')}>
                                <div className="service-name">{p.nombre}</div>
                                <div className="service-price">${p.precio_venta.toFixed(2)}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock: {p.stock_actual}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Carrito */}
                <div className="cart-panel">
                    <div className="cart-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                            <Icon name="shopping-cart" size={20} color="#374151" />
                            <h3 style={{ margin: 0 }}>Carrito</h3>
                        </div>
                    </div>

                    <div className="cart-items">
                        {cart.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                Agrega servicios o productos
                            </p>
                        ) : (
                            cart.map((item, index) => (
                                <div key={index} className="cart-item">
                                    <div>
                                        <div className="cart-item-name">{item.nombre}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => updateQuantity(index, -1)}
                                                style={{ padding: '0.25rem 0.5rem' }}
                                            >-</button>
                                            <span>{item.cantidad}</span>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => updateQuantity(index, 1)}
                                                style={{ padding: '0.25rem 0.5rem' }}
                                            >+</button>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="cart-item-price">${item.subtotal.toFixed(2)}</div>
                                        <button className="cart-item-remove" onClick={() => removeFromCart(index)}>×</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="cart-footer">
                        <div className="form-group">
                            <label className="form-label">Barbero</label>
                            <select
                                className="form-select"
                                value={barberoId}
                                onChange={(e) => setBarberoId(e.target.value)}
                            >
                                <option value="">Sin barbero (solo productos)</option>
                                {barberos.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Método de Pago</label>
                            <select
                                className="form-select"
                                value={metodoPago}
                                onChange={(e) => setMetodoPago(e.target.value)}
                            >
                                <option value="Efectivo">Efectivo</option>
                                <option value="Tarjeta">Tarjeta</option>
                                <option value="Transferencia">Transferencia</option>
                            </select>
                        </div>

                        <div className="cart-total">
                            <span>Total:</span>
                            <span className="cart-total-value">${getTotal().toFixed(2)}</span>
                        </div>

                        <button
                            className="btn btn-primary btn-block btn-lg"
                            onClick={handleVenta}
                            disabled={processing || cart.length === 0}
                        >
                            {processing ? 'Procesando...' : (
                                <>
                                    <Icon name="check-circle" size={20} color="white" />
                                    <span>Cobrar</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // QR Modal
    const qrModal = qrData && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                background: '#1a1a2e', borderRadius: 20, padding: '2rem',
                maxWidth: 420, width: '90%', textAlign: 'center',
                border: '2px solid rgba(201,162,39,0.3)', boxShadow: '0 0 40px rgba(201,162,39,0.15)'
            }} onClick={e => e.stopPropagation()}>
                <h2 style={{ color: '#c9a227', marginBottom: '0.25rem', fontSize: '1.3rem' }}>💈 ¡Sello de Fidelidad!</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    El cliente escanea este QR para confirmar la venta
                </p>
                <div style={{
                    background: 'white', borderRadius: 16, padding: '1.5rem',
                    display: 'inline-block', marginBottom: '1.25rem'
                }}>
                    <QRCodeSVG value={qrData.url} size={220} level="H" />
                </div>
                <div style={{
                    color: qrTimeLeft <= 60 ? '#ff6b6b' : '#c9a227',
                    fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem',
                    fontFamily: 'monospace'
                }}>
                    ⏱ {formatTime(qrTimeLeft)}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
                    Expira en {formatTime(qrTimeLeft)} — uso único
                </p>

                {/* Botón Confirmar sin QR */}
                <button onClick={confirmarSinQR} style={{
                    background: 'linear-gradient(135deg, #2ea043, #238636)',
                    border: 'none', color: 'white', padding: '0.75rem 2rem',
                    borderRadius: 12, cursor: 'pointer', fontSize: '0.95rem',
                    fontWeight: 'bold', width: '100%', marginBottom: '0.75rem',
                    transition: 'opacity 0.2s'
                }}>
                    ✅ Confirmar sin QR
                </button>

                {/* Botón Cancelar */}
                <button onClick={() => cancelarVenta()} style={{
                    background: 'none', border: '1px solid rgba(255,100,100,0.4)',
                    color: 'rgba(255,100,100,0.7)', padding: '0.6rem 2rem',
                    borderRadius: 10, cursor: 'pointer', fontSize: '0.9rem', width: '100%'
                }}>
                    ❌ Cancelar venta
                </button>
            </div>
        </div>
    );

    return (
        <>
            {mainContent}
            {qrModal}
        </>
    );
}
