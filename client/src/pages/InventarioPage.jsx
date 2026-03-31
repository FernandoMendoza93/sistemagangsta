import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { productosService } from '../services/api';
import { Store, Package, History, AlertTriangle, Activity, Search, Plus, Filter, Edit2, List, Check, X } from 'lucide-react';


export default function InventarioPage() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('');
    const [categoriaActiva, setCategoriaActiva] = useState('Todos');

    const [showMovModal, setShowMovModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [movimiento, setMovimiento] = useState({ tipo: 'Entrada', cantidad: 1, motivo: '' });

    const [showProductModal, setShowProductModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        stock_actual: 0,
        stock_minimo: 5,
        precio_costo: 0,
        comision_barbero: 0,
        precio_venta: 0,
        id_categoria: 1,
        activo: 1
    });

    const [showHistorialModal, setShowHistorialModal] = useState(false);
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [prodRes, catRes] = await Promise.all([
                productosService.getAll(),
                productosService.getCategorias()
            ]);
            setProductos(prodRes.data);
            setCategorias(catRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditMode(false);
        setFormData({ nombre: '', descripcion: '', stock_actual: 0, stock_minimo: 5, precio_costo: 0, comision_barbero: 0, precio_venta: 0, id_categoria: 1, activo: 1 });
        setShowProductModal(true);
    };

    const openEditModal = (producto) => {
        setEditMode(true);
        setFormData({
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            stock_actual: producto.stock_actual,
            stock_minimo: producto.stock_minimo,
            precio_costo: producto.precio_costo || 0,
            comision_barbero: producto.comision_barbero || 0,
            precio_venta: producto.precio_venta || 0,
            id_categoria: producto.id_categoria || 1,
            activo: producto.activo
        });
        setSelectedProduct(producto);
        setShowProductModal(true);
    };

    const handleSaveProduct = async () => {
        if (!formData.nombre.trim()) {
            toast.warning('El nombre es requerido');
            return;
        }
        try {
            if (editMode) {
                await productosService.update(selectedProduct.id, formData);
            } else {
                await productosService.create(formData);
            }
            setShowProductModal(false);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al guardar producto');
        }
    };

    const handleToggleActive = async (producto) => {
        try {
            await productosService.update(producto.id, { activo: producto.activo ? 0 : 1 });
            loadData();
        } catch (error) {
            toast.error('Error al cambiar estado');
        }
    };

    const openMovModal = (producto) => {
        setSelectedProduct(producto);
        setMovimiento({ tipo: 'Entrada', cantidad: 1, motivo: '' });
        setShowMovModal(true);
    };

    const handleMovimiento = async () => {
        if (!selectedProduct || movimiento.cantidad <= 0) return;
        try {
            await productosService.registrarMovimiento(selectedProduct.id, movimiento);
            setShowMovModal(false);
            setMovimiento({ tipo: 'Entrada', cantidad: 1, motivo: '' });
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al registrar movimiento');
        }
    };

    const openHistorialModal = async (producto) => {
        setSelectedProduct(producto);
        setLoadingHistorial(true);
        setShowHistorialModal(true);
        try {
            const res = await productosService.getMovimientos(producto.id);
            setHistorial(res.data);
        } catch (error) {
            console.error('Error:', error);
            setHistorial([]);
        } finally {
            setLoadingHistorial(false);
        }
    };

    const filteredProducts = productos.filter(p => {
        const matchTexto = p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
            p.descripcion?.toLowerCase().includes(filtro.toLowerCase());
        const matchCategoria = categoriaActiva === 'Todos' || p.categoria === categoriaActiva;
        return matchTexto && matchCategoria;
    });

    const getCategoriaIcon = (categoria) => {
        switch (categoria) {
            case 'Venta': return '🛒';
            case 'Insumo Limpieza': return '🧹';
            case 'Herramientas': return '🔧';
            default: return '📦';
        }
    };

    const cardStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px var(--shadow-color)' };
    const inputStyle = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', outline: 'none', transition: 'all 0.2s' };
    const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' };
    const modalStyle = { background: 'var(--bg-surface)', width: '100%', borderRadius: '32px', boxShadow: '0 25px 50px var(--shadow-color)', border: '1px solid var(--border-color)', overflow: 'hidden' };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div className="spinner" style={{ borderColor: 'var(--accent-primary)' }}></div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem 2rem', maxWidth: '1300px', margin: '0 auto', paddingBottom: '6rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.5px' }}>
                        <Activity style={{ width: '28px', height: '28px', color: 'var(--accent-primary)' }} /> Inventario de Stock
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500, marginTop: '0.25rem' }}>
                        Gestiona tus insumos y productos para venta
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flexGrow: 1 }}>
                        <input
                            type="text"
                            style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                            placeholder="Buscar producto..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
                    </div>
                    <button
                        style={{ background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '44px', transition: 'all 0.2s' }}
                        onClick={openCreateModal}
                    >
                        + Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ ...cardStyle, padding: '1.25rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Total</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{productos.length}</p>
                </div>
                <div style={{ ...cardStyle, padding: '1.25rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Categorías</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{categorias.length}</p>
                </div>
                <div style={{ ...cardStyle, padding: '1.25rem', background: 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.15)' }}>
                    <p style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Stock Bajo</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#DC2626', margin: 0 }}>
                        {productos.filter(p => p.stock_actual <= p.stock_minimo).length}
                    </p>
                </div>
                <div style={{ ...cardStyle, padding: '1.25rem', background: 'rgba(16, 185, 129, 0.06)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                    <p style={{ color: '#10B981', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Activos</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669', margin: 0 }}>
                        {productos.filter(p => p.activo).length}
                    </p>
                </div>
            </div>

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <button
                    style={{
                        whiteSpace: 'nowrap',
                        padding: '0.625rem 1.25rem',
                        borderRadius: '16px',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: categoriaActiva === 'Todos' ? 'var(--text-main)' : 'var(--bg-input)',
                        color: categoriaActiva === 'Todos' ? 'var(--bg-surface)' : 'var(--text-muted)'
                    }}
                    onClick={() => setCategoriaActiva('Todos')}
                >
                    Todos
                </button>
                {categorias.map(cat => (
                    <button
                        key={cat.id}
                        style={{
                            whiteSpace: 'nowrap',
                            padding: '0.625rem 1.25rem',
                            borderRadius: '16px',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            border: categoriaActiva === cat.nombre ? 'none' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: categoriaActiva === cat.nombre ? 'var(--accent-primary)' : 'var(--bg-surface)',
                            color: categoriaActiva === cat.nombre ? '#fff' : 'var(--text-muted)'
                        }}
                        onClick={() => setCategoriaActiva(cat.nombre)}
                    >
                        <span>{getCategoriaIcon(cat.nombre)}</span>
                        {cat.nombre}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div style={{ ...cardStyle, borderRadius: '32px', padding: 0, overflow: 'hidden' }}>
                {/* Desktop Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem', padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-input)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <div style={{ gridColumn: 'span 4' }}>Producto</div>
                    <div style={{ gridColumn: 'span 2' }}>Categoría</div>
                    <div style={{ gridColumn: 'span 2' }}>Stock / Min</div>
                    <div style={{ gridColumn: 'span 2' }}>Precio Venta</div>
                    <div style={{ gridColumn: 'span 2', textAlign: 'right' }}>Acciones</div>
                </div>

                <div>
                    {filteredProducts.length === 0 ? (
                        <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>
                            <Store style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.1 }} />
                            No se encontraron productos
                        </div>
                    ) : (
                        filteredProducts.map(p => (
                            <div
                                key={p.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(12, 1fr)',
                                    gap: '1rem',
                                    padding: '1rem 1.5rem',
                                    alignItems: 'center',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    background: 'var(--bg-surface)',
                                    transition: 'all 0.2s',
                                    opacity: p.activo ? 1 : 0.5,
                                    filter: p.activo ? 'none' : 'grayscale(1)'
                                }}
                            >
                                {/* Product */}
                                <div style={{ gridColumn: 'span 4' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{p.nombre}</h3>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion || 'Sin descripción'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Category */}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.375rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em',
                                        background: p.categoria === 'Venta' ? 'rgba(16, 185, 129, 0.1)' : p.categoria === 'Insumo Limpieza' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                        color: p.categoria === 'Venta' ? '#059669' : p.categoria === 'Insumo Limpieza' ? '#2563EB' : '#D97706'
                                    }}>
                                        {getCategoriaIcon(p.categoria)} {p.categoria}
                                    </span>
                                </div>

                                {/* Stock */}
                                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: 900,
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '8px',
                                        background: p.stock_actual <= p.stock_minimo ? '#EF4444' : 'var(--text-main)',
                                        color: '#fff'
                                    }}>
                                        {p.stock_actual}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                                        Min: {p.stock_minimo}
                                    </div>
                                    {p.stock_actual <= p.stock_minimo && (
                                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                            Bajo
                                        </div>
                                    )}
                                </div>

                                {/* Price */}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <span style={{ color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 700 }}>
                                        {p.categoria === 'Venta' ? `$${p.precio_venta?.toFixed(2)}` : '-'}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button
                                        style={{ height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}
                                        onClick={() => openEditModal(p)}
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        style={{ height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}
                                        onClick={() => openMovModal(p)}
                                        title="Ajustar Stock"
                                    >
                                        ±
                                    </button>
                                    <button
                                        style={{ height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}
                                        onClick={() => openHistorialModal(p)}
                                        title="Historial"
                                    >
                                        📋
                                    </button>
                                    <button
                                        style={{
                                            height: '36px',
                                            width: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            transition: 'all 0.2s',
                                            borderColor: p.activo ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                            background: p.activo ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                                            color: p.activo ? '#EF4444' : '#10B981'
                                        }}
                                        onClick={() => handleToggleActive(p)}
                                        title={p.activo ? 'Desactivar' : 'Activar'}
                                    >
                                        {p.activo ? '✕' : '✓'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Crear/Editar Producto */}
            {showProductModal && createPortal(
                <div style={modalOverlayStyle}>
                    <div style={{ ...modalStyle, maxWidth: '550px' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {editMode ? <Edit2 style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} /> : <Plus style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} />}
                                {editMode ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button style={{ height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-main)' }} onClick={() => setShowProductModal(false)}><X style={{ width: '20px', height: '20px' }} /></button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '4px', display: 'block', marginBottom: '0.375rem' }}>Nombre *</label>
                                <input type="text" style={inputStyle} placeholder="Nombre del producto" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '4px', display: 'block', marginBottom: '0.375rem' }}>Descripción</label>
                                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Descripción breve" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '4px', display: 'block', marginBottom: '0.375rem' }}>Categoría</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {categorias.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                border: `1px solid ${formData.id_categoria === cat.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                background: formData.id_categoria === cat.id ? 'rgba(var(--accent-primary-rgb), 0.1)' : 'var(--bg-input)',
                                                color: formData.id_categoria === cat.id ? 'var(--accent-primary)' : 'var(--text-muted)'
                                            }}
                                            onClick={() => setFormData({ ...formData, id_categoria: cat.id })}
                                        >
                                            <span style={{ fontSize: '1.1rem' }}>{getCategoriaIcon(cat.nombre)}</span>
                                            {cat.nombre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {!editMode && (
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '4px', display: 'block', marginBottom: '0.375rem' }}>Stock Inicial</label>
                                        <input 
                                            type="number" 
                                            style={inputStyle} 
                                            value={formData.stock_actual} 
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, stock_actual: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })} 
                                        />
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '4px', display: 'block', marginBottom: '0.375rem' }}>Stock Mínimo</label>
                                    <input 
                                        type="number" 
                                        style={inputStyle} 
                                        value={formData.stock_minimo} 
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => setFormData({ ...formData, stock_minimo: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })} 
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '4px', display: 'block', marginBottom: '0.375rem' }}>Precio Costo</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>$</span>
                                        <input 
                                            type="number" 
                                            style={{ ...inputStyle, paddingLeft: '2rem' }} 
                                            value={formData.precio_costo} 
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, precio_costo: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} 
                                        />
                                    </div>
 drumbox
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '4px', display: 'block', marginBottom: '0.375rem' }}>Precio Venta</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>$</span>
                                        <input
                                            type="number"
                                            style={{ ...inputStyle, paddingLeft: '2rem', opacity: formData.id_categoria !== 1 ? 0.5 : 1, cursor: formData.id_categoria !== 1 ? 'not-allowed' : 'text' }}
                                            disabled={formData.id_categoria !== 1}
                                            value={formData.precio_venta}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, precio_venta: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, padding: '0 4px', marginTop: '0.25rem' }}>Solo Venta</p>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '4px', display: 'block', marginBottom: '0.375rem' }}>💰 Comisión por Venta (Barbero)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#f97316', fontWeight: 700 }}>$</span>
                                        <input
                                            type="number"
                                            style={{ ...inputStyle, paddingLeft: '2rem', borderColor: formData.comision_barbero > 0 ? '#f97316' : undefined }}
                                            value={formData.comision_barbero}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, comision_barbero: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, padding: '0 4px', marginTop: '0.25rem' }}>Monto fijo que gana el barbero por cada unidad vendida. Dejar en 0 si no aplica.</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', gap: '0.75rem', background: 'var(--bg-main)' }}>
                            <button
                                style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '16px', cursor: 'pointer', minHeight: '44px' }}
                                onClick={() => setShowProductModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                style={{ flex: 2, background: 'var(--accent-primary)', border: 'none', color: '#fff', fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '16px', cursor: 'pointer', minHeight: '44px' }}
                                onClick={handleSaveProduct}
                            >
                                {editMode ? 'Actualizar Producto' : 'Confirmar Registro'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Movimiento de Stock */}
            {showMovModal && createPortal(
                <div style={modalOverlayStyle}>
                    <div style={{ ...modalStyle, maxWidth: '450px' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} /> Ajustar Stock
                            </h3>
                            <button style={{ height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-main)' }} onClick={() => setShowMovModal(false)}><X style={{ width: '20px', height: '20px' }} /></button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ background: 'var(--text-main)', borderRadius: '16px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--bg-surface)' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6 }}>Stock Actual</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{selectedProduct?.stock_actual}</span>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{selectedProduct?.nombre}</h4>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.08em' }}>{selectedProduct?.categoria}</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {['Entrada', 'Salida', 'Ajuste'].map(t => (
                                        <button
                                            key={t}
                                            style={{
                                                padding: '0.5rem 0.25rem',
                                                borderRadius: '12px',
                                                fontSize: '0.65rem',
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                border: `1px solid ${movimiento.tipo === t ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                background: movimiento.tipo === t ? 'var(--accent-primary)' : 'var(--bg-input)',
                                                color: movimiento.tipo === t ? '#fff' : 'var(--text-muted)'
                                            }}
                                            onClick={() => setMovimiento({ ...movimiento, tipo: t })}
                                        >
                                            {t === 'Entrada' ? '📥 +' : t === 'Salida' ? '📤 -' : '🔄 ='} {t}
                                        </button>
                                    ))}
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', padding: '0 4px', marginBottom: '0.375rem' }}>
                                        {movimiento.tipo === 'Ajuste' ? 'Cantidad Final' : 'Cantidad a Procesar'}
                                    </label>
                                    <input
                                        type="number"
                                        style={{ ...inputStyle, textAlign: 'center', fontSize: '1.875rem', fontWeight: 900, padding: '1rem 1.5rem' }}
                                        min="0"
                                        value={movimiento.cantidad}
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => setMovimiento({ ...movimiento, cantidad: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', padding: '0 4px', marginBottom: '0.375rem' }}>Motivo / Notas</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="Ej: Compra, Uso interno..."
                                        value={movimiento.motivo}
                                        onChange={e => setMovimiento({ ...movimiento, motivo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '1.5rem', background: 'var(--bg-input)' }}>
                            <button
                                style={{ width: '100%', background: 'var(--text-main)', color: 'var(--bg-surface)', fontWeight: 700, padding: '1rem', borderRadius: '16px', border: 'none', cursor: 'pointer', minHeight: '44px', fontSize: '0.95rem' }}
                                onClick={handleMovimiento}
                            >
                                Registrar Movimiento
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Historial */}
            {showHistorialModal && createPortal(
                <div style={modalOverlayStyle}>
                    <div style={{ ...modalStyle, maxWidth: '650px' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <History style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} /> Historial de Movimientos
                            </h3>
                            <button style={{ height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-main)' }} onClick={() => setShowHistorialModal(false)}><X style={{ width: '20px', height: '20px' }} /></button>
                        </div>
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {loadingHistorial ? (
                                <div style={{ padding: '5rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ borderColor: 'var(--accent-primary)' }}></div></div>
                            ) : historial.length === 0 ? (
                                <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>No hay movimientos registrados para este producto</div>
                            ) : (
                                <div>
                                    {historial.map(mov => (
                                        <div key={mov.id} style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', transition: 'all 0.2s' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    height: '40px',
                                                    width: '40px',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.1rem',
                                                    background: mov.tipo === 'Entrada' ? 'rgba(16, 185, 129, 0.1)' : mov.tipo === 'Salida' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                    color: mov.tipo === 'Entrada' ? '#059669' : mov.tipo === 'Salida' ? '#DC2626' : '#D97706'
                                                }}>
                                                    {mov.tipo === 'Entrada' ? '📥' : mov.tipo === 'Salida' ? '📤' : '🔄'}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{mov.tipo}</p>
                                                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{new Date(mov.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: '1.1rem',
                                                    fontWeight: 900,
                                                    color: mov.tipo === 'Entrada' ? '#10B981' : mov.tipo === 'Salida' ? '#EF4444' : '#F59E0B'
                                                }}>
                                                    {mov.tipo === 'Salida' ? '-' : mov.tipo === 'Entrada' ? '+' : ''}{mov.cantidad}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mov.motivo || 'Sin descripción'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '1.5rem', background: 'var(--bg-main)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button style={{ background: 'var(--text-main)', color: 'var(--bg-surface)', fontWeight: 700, padding: '0.625rem 2rem', borderRadius: '16px', border: 'none', cursor: 'pointer', minHeight: '44px' }} onClick={() => setShowHistorialModal(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
