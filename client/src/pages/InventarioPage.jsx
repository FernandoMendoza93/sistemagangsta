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
            toast.error(error.response?.data?.error || 'Error al registrar movimiento');
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

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-primary)] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 lg:p-10 max-w-[1300px] mx-auto font-sans pb-24">
            {/* Header Bento style */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] m-0 flex items-center gap-3 tracking-tight">
                        <Activity className="w-7 h-7 text-[var(--accent-primary)]" /> Inventario de Stock
                    </h1>
                    <p className="text-gray-500 text-sm sm:text-base font-medium mt-1">
                        Gestiona tus insumos y productos para venta
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            className="w-full bg-[var(--bg-surface)] border border-[var(--glass-border)] rounded-2xl py-3 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)] outline-none transition-all"
                            placeholder="Buscar producto..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    </div>
                    <button 
                        className="bg-[var(--accent-primary)] text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-[var(--accent-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[44px]"
                        onClick={openCreateModal}
                    >
                        + Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Quick Metrics Bento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-5 rounded-3xl shadow-sm">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
                    <p className="text-2xl font-black text-gray-900">{productos.length}</p>
                </div>
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-5 rounded-3xl shadow-sm">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Categorías</p>
                    <p className="text-2xl font-black text-gray-900">{categorias.length}</p>
                </div>
                <div className="bg-red-50 backdrop-blur-xl border border-red-100 p-5 rounded-3xl shadow-sm">
                    <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-1">Stock Bajo</p>
                    <p className="text-2xl font-black text-red-600">
                        {productos.filter(p => p.stock_actual <= p.stock_minimo).length}
                    </p>
                </div>
                <div className="bg-emerald-50 backdrop-blur-xl border border-emerald-100 p-5 rounded-3xl shadow-sm">
                    <p className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">Activos</p>
                    <p className="text-2xl font-black text-emerald-600">
                        {productos.filter(p => p.activo).length}
                    </p>
                </div>
            </div>

            {/* Tabs de Categoría Responsive */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                <button
                    className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                        categoriaActiva === 'Todos' 
                        ? 'bg-gray-900 text-white shadow-md' 
                        : 'bg-white/60 text-gray-500 hover:bg-white border border-black/5'
                    }`}
                    onClick={() => setCategoriaActiva('Todos')}
                >
                    Todos
                </button>
                {categorias.map(cat => (
                        <button
                            key={cat.id}
                            className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
                                categoriaActiva === cat.nombre 
                                ? 'bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/20' 
                                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] border border-[var(--glass-border)]'
                            }`}
                            onClick={() => setCategoriaActiva(cat.nombre)}
                        >
                        <span>{getCategoriaIcon(cat.nombre)}</span>
                        {cat.nombre}
                    </button>
                ))}
            </div>

            {/* Content List: Desktop Table / Mobile Cards */}
            <div className="bg-white/85 backdrop-blur-2xl border border-white/60 rounded-[32px] shadow-xl shadow-black/5 overflow-hidden">
                {/* Desktop Header Hidden on small screens */}
                <div className="hidden lg:grid grid-cols-12 gap-4 p-6 border-b border-black/5 bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <div className="col-span-4">Producto</div>
                    <div className="col-span-2">Categoría</div>
                    <div className="col-span-2">Stock / Min</div>
                    <div className="col-span-2">Precio Venta</div>
                    <div className="col-span-2 text-right">Acciones</div>
                </div>

                <div className="divide-y divide-black/5">
                    {filteredProducts.length === 0 ? (
                        <div className="p-20 text-center text-gray-400 font-medium">
                            <Store className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            No se encontraron productos
                        </div>
                    ) : (
                        filteredProducts.map(p => (
                            <div 
                                key={p.id} 
                                className={`group p-6 lg:p-4 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center transition-all hover:bg-gray-50/50 ${!p.activo ? 'opacity-50 grayscale' : ''}`}
                            >
                                {/* Mobile Header / Desktop Product */}
                                <div className="col-span-4 mb-4 lg:mb-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-100 rounded-xl lg:hidden text-2xl">
                                            {getCategoriaIcon(p.categoria)}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 m-0">{p.nombre}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.descripcion || 'Sin descripción'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="col-span-2 mb-4 lg:mb-0">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider ${
                                        p.categoria === 'Venta' ? 'bg-emerald-100 text-emerald-600' :
                                        p.categoria === 'Insumo Limpieza' ? 'bg-blue-100 text-blue-600' : 
                                        'bg-amber-100 text-amber-600'
                                    }`}>
                                        <span className="hidden lg:inline">{getCategoriaIcon(p.categoria)}</span> {p.categoria}
                                    </span>
                                </div>

                                {/* Stock */}
                                <div className="col-span-2 mb-4 lg:mb-0 flex items-center gap-2">
                                    <div className={`text-sm font-black px-3 py-1 rounded-lg ${
                                        p.stock_actual <= p.stock_minimo ? 'bg-red-500 text-white' : 'bg-gray-900 text-white'
                                    }`}>
                                        {p.stock_actual}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">
                                        Min: {p.stock_minimo}
                                    </div>
                                    {p.stock_actual <= p.stock_minimo && (
                                        <div className="animate-pulse bg-red-100 text-red-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                            Bajo
                                        </div>
                                    )}
                                </div>

                                {/* Price */}
                                <div className="col-span-2 mb-6 lg:mb-0">
                                    <div className="flex flex-col lg:items-start text-xs font-bold">
                                        <span className="text-gray-400 uppercase text-[9px] mb-0.5 lg:hidden">Precio Venta</span>
                                        <span className="text-gray-900 text-sm">
                                            {p.categoria === 'Venta' ? `$${p.precio_venta?.toFixed(2)}` : '-'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex justify-end gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        className="h-11 w-11 lg:h-9 lg:w-9 flex items-center justify-center bg-white border border-black/5 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm"
                                        onClick={() => openEditModal(p)}
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="h-11 w-11 lg:h-9 lg:w-9 flex items-center justify-center bg-white border border-black/5 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm"
                                        onClick={() => openMovModal(p)}
                                        title="Ajustar Stock"
                                    >
                                        ±
                                    </button>
                                    <button
                                        className="h-11 w-11 lg:h-9 lg:w-9 flex items-center justify-center bg-white border border-black/5 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm"
                                        onClick={() => openHistorialModal(p)}
                                        title="Historial"
                                    >
                                        📋
                                    </button>
                                    <button
                                        className={`h-11 w-11 lg:h-9 lg:w-9 flex items-center justify-center border rounded-xl shadow-sm transition-colors ${
                                            p.activo ? 'border-red-100 bg-red-50 text-red-500 hover:bg-red-100' : 'border-emerald-100 bg-emerald-50 text-emerald-500 hover:bg-emerald-100'
                                        }`}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-sm transition-all" onClick={() => setShowProductModal(false)}>
                    <div className="bg-white/95 backdrop-blur-xl w-full max-w-[550px] rounded-[32px] shadow-2xl border border-white/60 overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-[var(--bg-main)]">
                            <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                                {editMode ? <Edit2 className="w-5 h-5 text-[var(--accent-primary)]" /> : <Plus className="w-5 h-5 text-[var(--accent-primary)]" />}
                                {editMode ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors" onClick={() => setShowProductModal(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nombre *</label>
                                <input
                                    type="text"
                                    className="w-full bg-[var(--bg-surface)] border border-[var(--glass-border)] rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)] outline-none transition-all"
                                    placeholder="Nombre del producto"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
                                <textarea
                                    className="w-full bg-white border border-black/5 rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-coral/20 focus:border-coral outline-none transition-all min-h-[80px]"
                                    placeholder="Descripción breve"
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Categoría</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {categorias.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            className={`py-2 px-3 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-1 ${
                                                formData.id_categoria === cat.id 
                                                ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-sm' 
                                                : 'bg-[var(--bg-surface)] border-[var(--glass-border)] text-[var(--text-muted)] hover:border-gray-300'
                                            }`}
                                            onClick={() => setFormData({ ...formData, id_categoria: cat.id })}
                                        >
                                            <span className="text-lg">{getCategoriaIcon(cat.nombre)}</span>
                                            {cat.nombre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {!editMode && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Stock Inicial</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-black/5 rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-coral/20 focus:border-coral outline-none transition-all"
                                            value={formData.stock_actual}
                                            onChange={e => setFormData({ ...formData, stock_actual: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Stock Mínimo</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white border border-black/5 rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-coral/20 focus:border-coral outline-none transition-all"
                                        value={formData.stock_minimo}
                                        onChange={e => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Precio Costo</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-black/5 rounded-2xl py-3 pl-8 pr-4 text-sm font-medium focus:ring-2 focus:ring-coral/20 focus:border-coral outline-none transition-all"
                                            value={formData.precio_costo}
                                            onChange={e => setFormData({ ...formData, precio_costo: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Precio Venta</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            className={`w-full bg-white border border-black/5 rounded-2xl py-3 pl-8 pr-4 text-sm font-medium focus:ring-2 focus:ring-coral/20 focus:border-coral outline-none transition-all ${formData.id_categoria !== 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={formData.id_categoria !== 1}
                                            value={formData.precio_venta}
                                            onChange={e => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium px-1">Solo Venta</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 flex gap-3 bg-[var(--bg-main)]">
                            <button 
                                className="flex-1 bg-[var(--bg-surface)] border border-[var(--glass-border)] text-[var(--text-muted)] font-bold py-3 px-6 rounded-2xl hover:bg-[var(--bg-card-hover)] transition-all min-h-[44px]" 
                                onClick={() => setShowProductModal(false)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="flex-[2] bg-[var(--accent-primary)] text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-[var(--accent-primary)]/20 transition-all min-h-[44px]" 
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-sm transition-all" onClick={() => setShowMovModal(false)}>
                    <div className="bg-white/95 backdrop-blur-xl w-full max-w-[450px] rounded-[32px] shadow-2xl border border-white/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-[var(--bg-main)]">
                            <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                                <Activity className="w-5 h-5 text-[var(--accent-primary)]" /> Ajustar Stock
                            </h3>
                            <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors" onClick={() => setShowMovModal(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-[var(--text-main)] rounded-2xl p-4 flex justify-between items-center text-[var(--bg-surface)] shadow-inner">
                                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Stock Actual</span>
                                <span className="text-2xl font-black">{selectedProduct?.stock_actual}</span>
                            </div>
                            
                            <div className="space-y-1.5 text-center">
                                <h4 className="text-base font-bold text-gray-900">{selectedProduct?.nombre}</h4>
                                <p className="text-xs text-gray-500 uppercase font-black tracking-widest">{selectedProduct?.categoria}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    {['Entrada', 'Salida', 'Ajuste'].map(t => (
                                        <button
                                            key={t}
                                            className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                movimiento.tipo === t 
                                                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md shadow-[var(--accent-primary)]/20' 
                                                : 'bg-[var(--bg-surface)] border-[var(--glass-border)] text-[var(--text-muted)]'
                                            }`}
                                            onClick={() => setMovimiento({...movimiento, tipo: t})}
                                        >
                                            {t === 'Entrada' ? '📥 +' : t === 'Salida' ? '📤 -' : '🔄 ='} {t}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-1.5 pt-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block px-1">
                                        {movimiento.tipo === 'Ajuste' ? 'Cantidad Final' : 'Cantidad a Procesar'}
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full bg-white border border-black/5 rounded-2xl py-4 px-6 text-center text-3xl font-black focus:ring-2 focus:ring-coral/20 focus:border-coral outline-none transition-all shadow-sm"
                                        min="0"
                                        value={movimiento.cantidad}
                                        onChange={e => setMovimiento({ ...movimiento, cantidad: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block px-1">Motivo / Notas</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-black/5 rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-coral/20 focus:border-coral outline-none transition-all"
                                        placeholder="Ej: Compra, Uso interno..."
                                        value={movimiento.motivo}
                                        onChange={e => setMovimiento({ ...movimiento, motivo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50/50">
                            <button 
                                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all min-h-[44px]"
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-sm transition-all" onClick={() => setShowHistorialModal(false)}>
                    <div className="bg-white/95 backdrop-blur-xl w-full max-w-[650px] rounded-[32px] shadow-2xl border border-white/60 overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-[var(--bg-main)]">
                            <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                                <History className="w-5 h-5 text-[var(--accent-primary)]" /> Historial de Movimientos
                            </h3>
                            <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors" onClick={() => setShowHistorialModal(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-0 max-h-[500px] overflow-y-auto no-scrollbar">
                            {loadingHistorial ? (
                                <div className="p-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-coral border-t-transparent"></div></div>
                            ) : historial.length === 0 ? (
                                <div className="p-20 text-center text-gray-400 font-medium">No hay movimientos registrados para este producto</div>
                            ) : (
                                <div className="divide-y divide-black/5">
                                    {historial.map(mov => (
                                        <div key={mov.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${
                                                    mov.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-600' :
                                                    mov.tipo === 'Salida' ? 'bg-red-100 text-red-600' : 
                                                    'bg-amber-100 text-amber-600'
                                                }`}>
                                                    {mov.tipo === 'Entrada' ? '📥' : mov.tipo === 'Salida' ? '📤' : '🔄'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 uppercase tracking-widest">{mov.tipo}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(mov.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short'})}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-black ${
                                                    mov.tipo === 'Entrada' ? 'text-emerald-500' :
                                                    mov.tipo === 'Salida' ? 'text-red-500' : 
                                                    'text-amber-500'
                                                }`}>
                                                    {mov.tipo === 'Salida' ? '-' : mov.tipo === 'Entrada' ? '+' : ''}{mov.cantidad}
                                                </p>
                                                <p className="text-[10px] text-gray-400 italic max-w-[150px] truncate">{mov.motivo || 'Sin descripción'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-[var(--bg-main)] flex justify-end">
                            <button className="bg-[var(--text-main)] text-[var(--bg-surface)] font-bold py-2.5 px-8 rounded-2xl hover:opacity-90 transition-all min-h-[44px]" onClick={() => setShowHistorialModal(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
