import { useState, useEffect } from 'react';
import { serviciosService, productosService, barberosService, ventasService, clientesService, citasService } from '../services/api';
import dayjs from 'dayjs';
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
    const [clienteId, setClienteId] = useState('');
    const [clientes, setClientes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [tab, setTab] = useState('servicios');
    const [showRewardModal, setShowRewardModal] = useState(null);
    const [citasPendientes, setCitasPendientes] = useState([]);
    const [selectedCitaId, setSelectedCitaId] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const fetchCitasPendientes = async () => {
            if (!barberoId) {
                setCitasPendientes([]);
                setSelectedCitaId('');
                return;
            }
            try {
                const hoy = dayjs().format('YYYY-MM-DD');
                const res = await citasService.getAll(hoy, 'Pendiente');
                const citasBarbero = res.data.filter(c => c.id_barbero.toString() === barberoId.toString());
                setCitasPendientes(citasBarbero);
                
                if (citasBarbero.length === 1) {
                    setSelectedCitaId(citasBarbero[0].id.toString());
                } else {
                    setSelectedCitaId('');
                }
            } catch (error) {
                console.error('Error buscando citas pendientes:', error);
            }
        };
        fetchCitasPendientes();
    }, [barberoId]);

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
            
            try {
                // Se aisla la carga de clientes para que no rompa el POS si falla
                const cliRes = await clientesService.getAll();
                setClientes(cliRes.data);
            } catch (cliError) {
                console.error('Error cargando la libreta de clientes:', cliError);
                setClientes([]);
            }

            // Si el usuario es barbero, seleccionarlo automáticamente
            if (user?.barbero) {
                setBarberoId(user.barbero.id);
            }
        } catch (error) {
            console.error('Error cargando catalogo base:', error);
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

    const getSubtotal = () => cart.reduce((sum, item) => sum + item.subtotal, 0);

    const getDescuento = () => {
        if (!clienteSeleccionado) return 0;
        const discountRate = (clienteSeleccionado.descuento_activo || 0) / 100;
        return getSubtotal() * discountRate;
    };

    const getTotal = () => getSubtotal() - getDescuento();

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
                id_cliente: clienteId || null,
                metodo_pago: metodoPago,
                items,
                id_cita: selectedCitaId || null
            });

            if (res.data.recompensa?.alcanzada) {
                setShowRewardModal(res.data.recompensa);
            } else {
                setMessage({ type: 'success', text: `¡Venta #${res.data.id} registrada exitosamente! ✅` });
                // Ocultar mensaje de éxito después de 3 segundos
                setTimeout(() => {
                    setMessage(null);
                }, 3000);
            }

            setCart([]);
            setCitasPendientes([]);
            setSelectedCitaId('');

        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Error al registrar venta' });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    const mainContent = (
        <div>
            <div className="page-header">
                <div className="header-title-wrapper">
                    <div className="title-icon">
                        <Icon name="shopping-cart" size={28} color="var(--accent-primary)" />
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
                                    <Icon name="clock" size={14} color="var(--text-muted)" />
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
                            <Icon name="shopping-cart" size={20} color="var(--text-main)" />
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
                            <label className="form-label">Cliente (Opcional - Para Puntos y Descuentos)</label>
                            <select
                                className="form-select"
                                value={clienteId}
                                onChange={(e) => {
                                    setClienteId(e.target.value);
                                    if(e.target.value) {
                                        const cli = clientes.find(c => c.id.toString() === e.target.value);
                                        setClienteSeleccionado(cli);
                                    } else {
                                        setClienteSeleccionado(null);
                                    }
                                }}
                            >
                                <option value="">Venta Pública (Sin Asignar)</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre} {c.nivel ? `(${c.nivel.nombre})` : ''}</option>
                                ))}
                            </select>
                            {clienteSeleccionado?.descuento_activo > 0 && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Icon name="tag" size={14} />
                                    Aplica {clienteSeleccionado.descuento_activo}% de desc. por Nivel {clienteSeleccionado.nivel.nombre}
                                </div>
                            )}
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

                        {citasPendientes.length > 0 && (
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #F59E0B', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F59E0B', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    <Icon name="alert-triangle" size={18} />
                                    <span>¡Cita Pendiente Detectada!</span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>
                                    Este barbero tiene cita(s) agendada(s) hoy. ¿Quieres enlazar el cobro para cerrarla automáticamente en la agenda?
                                </p>
                                <select 
                                    className="form-select form-select-sm" 
                                    style={{ background: 'var(--bg-surface)' }}
                                    value={selectedCitaId} 
                                    onChange={(e) => setSelectedCitaId(e.target.value)}
                                >
                                    <option value="">No enlazar a ninguna cita</option>
                                    {citasPendientes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            Cita a las {dayjs(c.fecha_hora).format('hh:mm A')} - {c.cliente_nombre || 'Sin nombre'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="cart-total" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', paddingBottom: '0.5rem' }}>
                            <span>Subtotal:</span>
                            <span style={{fontWeight: '500'}}>${getSubtotal().toFixed(2)}</span>
                        </div>
                        {getDescuento() > 0 && (
                            <div className="cart-total" style={{ color: 'var(--success)', marginBottom: '0.5rem', paddingBottom: '0.5rem' }}>
                                <span>Descuento Nivel:</span>
                                <span>-${getDescuento().toFixed(2)}</span>
                            </div>
                        )}
                        <div className="cart-total" style={{ fontSize: '1.4rem' }}>
                            <span>Total a Cobrar:</span>
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

    return (
        <>
            {mainContent}

            {showRewardModal && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px', background: 'var(--bg-surface)', padding: '2rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '8px', background: 'linear-gradient(90deg, #F59E0B, #EF4444)' }}></div>
                        <div style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="gift" size={40} color="#F59E0B" />
                        </div>
                        <h2 style={{ color: 'var(--text-main)', fontSize: '1.8rem', marginBottom: '0.5rem' }}>¡Premio Alcanzado!</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
                            Este cliente ha completado su ciclo de frecuencia y ganó:
                        </p>
                        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                            <strong style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>{showRewardModal.nombre_premio}</strong>
                        </div>
                        {showRewardModal.nuevo_nivel && (
                            <p style={{ color: 'var(--success)', fontWeight: '600', marginBottom: '1.5rem' }}>
                                ⭐ ¡Además subió al de rango {showRewardModal.nuevo_nivel}!
                            </p>
                        )}
                        <button 
                            className="btn btn-primary btn-block btn-lg" 
                            onClick={() => setShowRewardModal(null)}
                        >
                            Entendido, Cobrar Siguiente
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
