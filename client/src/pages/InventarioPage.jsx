import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { productosService } from '../services/api';

export default function InventarioPage() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('');
    const [categoriaActiva, setCategoriaActiva] = useState('Todos');

    // Modal de movimiento de stock
    const [showMovModal, setShowMovModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [movimiento, setMovimiento] = useState({ tipo: 'Entrada', cantidad: 1, motivo: '' });

    // Modal de crear/editar producto
    const [showProductModal, setShowProductModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        stock_actual: 0,
        stock_minimo: 5,
        precio_costo: 0,
        precio_venta: 0,
        id_categoria: 1,
        activo: 1
    });

    // Modal de historial
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

    // ==================== CRUD ====================

    const openCreateModal = () => {
        setEditMode(false);
        setFormData({
            nombre: '',
            descripcion: '',
            stock_actual: 0,
            stock_minimo: 5,
            precio_costo: 0,
            precio_venta: 0,
            id_categoria: 1,
            activo: 1
        });
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
            precio_venta: producto.precio_venta || 0,
            id_categoria: producto.id_categoria || 1,
            activo: producto.activo
        });
        setSelectedProduct(producto);
        setShowProductModal(true);
    };

    const handleSaveProduct = async () => {
        if (!formData.nombre.trim()) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'El nombre es requerido', confirmButtonColor: '#c9a227' });
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
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.error || 'Error al guardar producto', confirmButtonColor: '#c9a227' });
        }
    };

    const handleToggleActive = async (producto) => {
        try {
            await productosService.update(producto.id, { activo: producto.activo ? 0 : 1 });
            loadData();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error al cambiar estado', confirmButtonColor: '#c9a227' });
        }
    };

    // ==================== MOVIMIENTOS ====================

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
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.error || 'Error al registrar movimiento', confirmButtonColor: '#c9a227' });
        }
    };

    // ==================== HISTORIAL ====================

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

    // ==================== FILTROS ====================

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

    const getCategoriaColor = (categoria) => {
        switch (categoria) {
            case 'Venta': return 'badge-success';
            case 'Insumo Limpieza': return 'badge-info';
            case 'Herramientas': return 'badge-warning';
            default: return 'badge-info';
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">📦 Inventario</h1>
                    <p className="page-subtitle">{productos.length} productos registrados</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 Buscar producto..."
                        style={{ width: '250px' }}
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        + Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Tabs de Categoría */}
            <div className="category-tabs" style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
            }}>
                <button
                    className={`btn ${categoriaActiva === 'Todos' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCategoriaActiva('Todos')}
                >
                    📦 Todos ({productos.length})
                </button>
                {categorias.map(cat => (
                    <button
                        key={cat.id}
                        className={`btn ${categoriaActiva === cat.nombre ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCategoriaActiva(cat.nombre)}
                    >
                        {getCategoriaIcon(cat.nombre)} {cat.nombre} ({productos.filter(p => p.categoria === cat.nombre).length})
                    </button>
                ))}
            </div>

            {/* Tabla de Productos */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th>Stock</th>
                                <th>Precio Costo</th>
                                <th>Precio Venta</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No hay productos que mostrar
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(p => (
                                    <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                                        <td>
                                            <strong style={{ color: '#1a1a1a' }}>{p.nombre}</strong>
                                            {p.descripcion && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {p.descripcion}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${getCategoriaColor(p.categoria)}`}>
                                                {getCategoriaIcon(p.categoria)} {p.categoria}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={p.stock_actual <= p.stock_minimo ? 'badge badge-danger' : 'badge badge-success'}>
                                                {p.stock_actual}
                                            </span>
                                            {p.stock_actual <= p.stock_minimo && (
                                                <span style={{ marginLeft: '0.5rem', color: 'var(--danger)' }}>⚠️ Bajo</span>
                                            )}
                                        </td>
                                        <td style={{ color: '#1a1a1a' }}>${p.precio_costo?.toFixed(2) || '0.00'}</td>
                                        <td style={{ fontWeight: 600, color: '#1a1a1a' }}>
                                            {p.categoria === 'Venta' ? `$${p.precio_venta?.toFixed(2) || '0.00'}` : '-'}
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${p.activo ? 'badge-success' : 'badge-danger'}`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleToggleActive(p)}
                                                title="Click para cambiar estado"
                                            >
                                                {p.activo ? '✓ Activo' : '✗ Inactivo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => openEditModal(p)}
                                                    title="Editar producto"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => openMovModal(p)}
                                                    title="Ajustar stock"
                                                >
                                                    ± Stock
                                                </button>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => openHistorialModal(p)}
                                                    title="Ver historial"
                                                >
                                                    📋
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Crear/Editar Producto */}
            {showProductModal && createPortal(
                <div className="custom-modal-overlay" onClick={() => setShowProductModal(false)}>
                    <div className="custom-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                        <div className="custom-modal-header">
                            <h3 className="custom-modal-title">
                                {editMode ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
                            </h3>
                            <button className="custom-modal-close" onClick={() => setShowProductModal(false)}>×</button>
                        </div>
                        <div className="custom-modal-body">
                            <div className="form-group">
                                <label className="form-label">Nombre *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Nombre del producto"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descripción</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Descripción breve"
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoría</label>
                                <select
                                    className="form-select"
                                    value={formData.id_categoria}
                                    onChange={e => setFormData({ ...formData, id_categoria: parseInt(e.target.value) })}
                                >
                                    {categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {getCategoriaIcon(cat.nombre)} {cat.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {!editMode && (
                                    <div className="form-group">
                                        <label className="form-label">Stock Inicial</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0"
                                            value={formData.stock_actual}
                                            onChange={e => setFormData({ ...formData, stock_actual: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Stock Mínimo</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        value={formData.stock_minimo}
                                        onChange={e => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Precio Costo</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        step="0.01"
                                        value={formData.precio_costo}
                                        onChange={e => setFormData({ ...formData, precio_costo: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Precio Venta</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        step="0.01"
                                        value={formData.precio_venta}
                                        onChange={e => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        Solo aplica para productos de venta
                                    </small>
                                </div>
                            </div>
                            {editMode && (
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.activo === 1}
                                            onChange={e => setFormData({ ...formData, activo: e.target.checked ? 1 : 0 })}
                                        />
                                        Producto activo
                                    </label>
                                </div>
                            )}
                        </div>
                        <div className="custom-modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSaveProduct}>
                                {editMode ? 'Guardar Cambios' : 'Crear Producto'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Movimiento de Stock */}
            {showMovModal && createPortal(
                <div className="custom-modal-overlay" onClick={() => setShowMovModal(false)}>
                    <div className="custom-modal" onClick={e => e.stopPropagation()}>
                        <div className="custom-modal-header">
                            <h3 className="custom-modal-title">± Movimiento de Stock: {selectedProduct?.nombre}</h3>
                            <button className="custom-modal-close" onClick={() => setShowMovModal(false)}>×</button>
                        </div>
                        <div className="custom-modal-body">
                            <div style={{
                                background: 'var(--bg-input)',
                                padding: '1rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                textAlign: 'center'
                            }}>
                                <span style={{ color: 'var(--text-muted)' }}>Stock actual: </span>
                                <strong style={{ fontSize: '1.25rem' }}>{selectedProduct?.stock_actual} unidades</strong>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tipo de Movimiento</label>
                                <select
                                    className="form-select"
                                    value={movimiento.tipo}
                                    onChange={e => setMovimiento({ ...movimiento, tipo: e.target.value })}
                                >
                                    <option value="Entrada">📥 Entrada (agregar stock)</option>
                                    <option value="Salida">📤 Salida (quitar stock)</option>
                                    <option value="Ajuste">🔄 Ajuste (establecer cantidad exacta)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    {movimiento.tipo === 'Ajuste' ? 'Nueva cantidad total' : 'Cantidad'}
                                </label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    value={movimiento.cantidad}
                                    onChange={e => setMovimiento({ ...movimiento, cantidad: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Motivo (opcional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ej: Compra de proveedor, uso interno, ajuste de inventario"
                                    value={movimiento.motivo}
                                    onChange={e => setMovimiento({ ...movimiento, motivo: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="custom-modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowMovModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleMovimiento}>Registrar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Historial */}
            {showHistorialModal && createPortal(
                <div className="custom-modal-overlay" onClick={() => setShowHistorialModal(false)}>
                    <div className="custom-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="custom-modal-header">
                            <h3 className="custom-modal-title">📋 Historial: {selectedProduct?.nombre}</h3>
                            <button className="custom-modal-close" onClick={() => setShowHistorialModal(false)}>×</button>
                        </div>
                        <div className="custom-modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {loadingHistorial ? (
                                <div className="loading"><div className="spinner"></div></div>
                            ) : historial.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No hay movimientos registrados
                                </p>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Tipo</th>
                                            <th>Cantidad</th>
                                            <th>Motivo</th>
                                            <th>Usuario</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.map(mov => (
                                            <tr key={mov.id}>
                                                <td style={{ fontSize: '0.85rem', color: '#1a1a1a' }}>
                                                    {new Date(mov.fecha).toLocaleString('es-MX', {
                                                        dateStyle: 'short',
                                                        timeStyle: 'short'
                                                    })}
                                                </td>
                                                <td>
                                                    <span className={`badge ${mov.tipo === 'Entrada' ? 'badge-success' :
                                                        mov.tipo === 'Salida' ? 'badge-danger' : 'badge-warning'
                                                        }`}>
                                                        {mov.tipo === 'Entrada' ? '📥' : mov.tipo === 'Salida' ? '📤' : '🔄'} {mov.tipo}
                                                    </span>
                                                </td>
                                                <td><strong style={{ color: '#1a1a1a' }}>{mov.cantidad}</strong></td>
                                                <td style={{ fontSize: '0.85rem', color: '#555' }}>
                                                    {mov.motivo || '-'}
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: '#1a1a1a' }}>{mov.usuario || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="custom-modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowHistorialModal(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
