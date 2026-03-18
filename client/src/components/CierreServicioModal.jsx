import { useState, useEffect, useRef } from 'react';
import { ventasService, productosService, serviciosService } from '../services/api';
import Icon from './Icon';
import './CierreServicioModal.css';

const METODOS_PAGO = [
    { key: 'Efectivo', icon: 'banknote' },
    { key: 'Tarjeta', icon: 'credit-card' },
    { key: 'Transferencia', icon: 'smartphone' }
];

export default function CierreServicioModal({ cita, onClose, onSuccess }) {
    const [busqueda, setBusqueda] = useState('');
    const [catalogo, setCatalogo] = useState([]); // productos + servicios búsqueda
    const [showDropdown, setShowDropdown] = useState(false);
    const [extras, setExtras] = useState([]);
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [loading, setLoading] = useState(false);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const searchRef = useRef(null);

    // Cargar catálogo completo al montar
    useEffect(() => {
        const cargarCatalogo = async () => {
            try {
                const [productosRes, serviciosRes] = await Promise.all([
                    productosService.getVenta(),
                    serviciosService.getActivos()
                ]);
                const items = [
                    ...(productosRes.data || []).map(p => ({
                        id: `prod-${p.id}`,
                        id_producto: p.id,
                        id_servicio: null,
                        nombre: p.nombre,
                        precio: p.precio_venta,
                        tipo: 'producto'
                    })),
                    ...(serviciosRes.data || []).map(s => ({
                        id: `svc-${s.id}`,
                        id_producto: null,
                        id_servicio: s.id,
                        nombre: s.nombre_servicio,
                        precio: s.precio,
                        tipo: 'servicio'
                    }))
                ];
                setCatalogo(items);
            } catch (err) {
                console.error('Error cargando catálogo:', err);
            } finally {
                setLoadingCatalog(false);
            }
        };
        cargarCatalogo();
    }, []);

    // Cerrar dropdown al hacer click afuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtrar catálogo por búsqueda
    const resultados = busqueda.trim().length > 0
        ? catalogo.filter(item =>
            item.nombre.toLowerCase().includes(busqueda.toLowerCase())
        ).slice(0, 8)
        : [];

    const agregarItem = (item) => {
        setExtras(prev => {
            const existe = prev.find(e => e.id === item.id);
            if (existe) {
                return prev.map(e => e.id === item.id ? { ...e, cantidad: e.cantidad + 1 } : e);
            }
            return [...prev, { ...item, cantidad: 1 }];
        });
        setBusqueda('');
        setShowDropdown(false);
    };

    const cambiarCantidad = (id, delta) => {
        setExtras(prev =>
            prev.map(e => e.id === id
                ? { ...e, cantidad: Math.max(1, e.cantidad + delta) }
                : e
            )
        );
    };

    const removerItem = (id) => {
        setExtras(prev => prev.filter(e => e.id !== id));
    };

    // Calcular totales
    const precioBase = cita?.precio || 0;
    const totalExtras = extras.reduce((acc, e) => acc + (e.precio * e.cantidad), 0);
    const totalFinal = precioBase + totalExtras;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const itemsExtra = extras.map(e => ({
                id_servicio: e.id_servicio,
                id_producto: e.id_producto,
                cantidad: e.cantidad,
                precio_unitario: e.precio
            }));
            await ventasService.completarCita(cita.id, itemsExtra, metodoPago);
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error cerrando servicio:', err);
            alert(err.response?.data?.error || 'Error al cerrar el servicio');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="csm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="csm-modal">
                {/* Header */}
                <div className="csm-header">
                    <div className="csm-header-left">
                        <div className="csm-icon-wrap">
                            <Icon name="scissors" size={18} />
                        </div>
                        <div>
                            <h2 className="csm-title">Cierre de Servicio</h2>
                            <p className="csm-subtitle">Confirma y agrega extras antes de cobrar</p>
                        </div>
                    </div>
                    <button className="csm-close-btn" onClick={onClose} aria-label="Cerrar">
                        <Icon name="x" size={18} />
                    </button>
                </div>

                <div className="csm-body">
                    {/* Bento: Servicio base (read-only) */}
                    <div className="csm-bento-base">
                        <div className="csm-base-info">
                            <span className="csm-base-label">⭐ Servicio Principal</span>
                            <span className="csm-base-name">{cita?.nombre_servicio || 'Servicio'}</span>
                            <span className="csm-base-client">
                                <Icon name="user" size={12} />
                                {cita?.cliente_nombre?.split(' ')[0]} • {cita?.hora}
                            </span>
                        </div>
                        <span className="csm-base-price">${precioBase.toFixed(2)}</span>
                    </div>

                    {/* Buscador de extras */}
                    <div>
                        <div className="csm-section-label">
                            <Icon name="plus-circle" size={14} />
                            Agregar productos o servicios extra
                        </div>
                        <div className="csm-search-wrapper" ref={searchRef}>
                            <span className="csm-search-icon">
                                <Icon name="search" size={16} />
                            </span>
                            <input
                                className="csm-search-input"
                                type="text"
                                placeholder={loadingCatalog ? 'Cargando catálogo...' : 'Buscar producto o servicio...'}
                                value={busqueda}
                                onChange={(e) => {
                                    setBusqueda(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => busqueda.trim() && setShowDropdown(true)}
                                disabled={loadingCatalog}
                            />
                            {showDropdown && resultados.length > 0 && (
                                <div className="csm-dropdown">
                                    {resultados.map(item => (
                                        <div
                                            key={item.id}
                                            className="csm-dropdown-item"
                                            onClick={() => agregarItem(item)}
                                        >
                                            <span>
                                                {item.nombre}
                                                <span className={`tag ${item.tipo}`}>
                                                    {item.tipo === 'producto' ? 'Producto' : 'Servicio'}
                                                </span>
                                            </span>
                                            <span className="price">${item.precio?.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lista de extras */}
                    <div>
                        <div className="csm-section-label">
                            <Icon name="shopping-bag" size={14} />
                            Items adicionales ({extras.length})
                        </div>
                        {extras.length === 0 ? (
                            <div className="csm-empty-extras">Sin extras — solo el servicio base</div>
                        ) : (
                            <div className="csm-extras-list">
                                {extras.map(e => (
                                    <div key={e.id} className="csm-extra-item">
                                        <span className="csm-extra-name">{e.nombre}</span>
                                        <div className="csm-extra-controls">
                                            <button className="csm-qty-btn" onClick={() => cambiarCantidad(e.id, -1)}>−</button>
                                            <span className="csm-qty-num">{e.cantidad}</span>
                                            <button className="csm-qty-btn" onClick={() => cambiarCantidad(e.id, 1)}>+</button>
                                        </div>
                                        <span className="csm-extra-subtotal">${(e.precio * e.cantidad).toFixed(2)}</span>
                                        <button className="csm-remove-btn" onClick={() => removerItem(e.id)} aria-label="Eliminar">
                                            <Icon name="trash-2" size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Método de pago */}
                    <div>
                        <div className="csm-section-label">
                            <Icon name="credit-card" size={14} />
                            Método de pago
                        </div>
                        <div className="csm-payment-options">
                            {METODOS_PAGO.map(m => (
                                <button
                                    key={m.key}
                                    className={`csm-payment-btn ${metodoPago === m.key ? 'active' : ''}`}
                                    onClick={() => setMetodoPago(m.key)}
                                >
                                    <Icon name={m.icon} size={14} />
                                    {m.key}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer con total y botón */}
                <div className="csm-footer">
                    <div className="csm-total-row">
                        <span className="csm-total-label">Total a cobrar</span>
                        <span className="csm-total-amount">${totalFinal.toFixed(2)}</span>
                    </div>
                    <button
                        className="csm-submit-btn"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading
                            ? <><Icon name="loader-2" size={16} /> Procesando...</>
                            : <><Icon name="lock" size={16} /> Cerrar Servicio</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
