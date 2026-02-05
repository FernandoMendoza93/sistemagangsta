import { useState, useEffect } from 'react';
import { serviciosService, productosService, barberosService, ventasService } from '../services/api';
import { useAuth } from '../context/AuthContext';
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

            await ventasService.create({
                id_barbero: barberoId || null,
                metodo_pago: metodoPago,
                items
            });

            setMessage({ type: 'success', text: `¡Venta registrada! Total: $${getTotal().toFixed(2)}` });
            setCart([]);
            loadData(); // Recargar productos para actualizar stock
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Error al registrar venta' });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
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
}
