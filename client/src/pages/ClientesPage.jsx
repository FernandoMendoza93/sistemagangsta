import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Crown, Trophy, Star, Settings, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clientesService } from '../services/api';
import Icon from '../components/Icon';
import ConfirmModal from '../components/ConfirmModal';
import './ClientesPage.css';

export default function ClientesPage() {
    const { user } = useAuth();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterActivity, setFilterActivity] = useState('todos');
    const [sortBy, setSortBy] = useState('nombre');
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', telefono: '', notas: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 15;
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [showStampModal, setShowStampModal] = useState(false);
    const [stampTarget, setStampTarget] = useState(null);
    const [stampLoading, setStampLoading] = useState(false);

    const [showHandoffModal, setShowHandoffModal] = useState(false);
    const [handoffData, setHandoffData] = useState(null);
    const [isResettingPin, setIsResettingPin] = useState(false);

    useEffect(() => {
        loadClientes();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => loadClientes(), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    async function loadClientes() {
        try {
            setLoading(true);
            const res = await clientesService.getAll(searchQuery || undefined);
            setClientes(res.data);
        } catch (error) {
            console.error('Error cargando clientes:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { setCurrentPage(1); }, [filterActivity, sortBy, searchQuery]);

    // Client-side filtering & sorting
    const filteredClientes = clientes
        .filter(c => {
            const days = getDaysSinceVisit(c.ultima_visita);
            if (filterActivity === 'nuevos') return days === null;
            if (filterActivity === 'recientes') return days !== null && days <= 7;
            if (filterActivity === 'regulares') return days !== null && days > 7 && days <= 30;
            if (filterActivity === 'inactivos') return days !== null && days > 30;
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
            if (sortBy === 'visita') {
                if (!a.ultima_visita) return 1;
                if (!b.ultima_visita) return -1;
                return new Date(b.ultima_visita) - new Date(a.ultima_visita);
            }
            if (sortBy === 'puntos') return (b.puntos_lealtad || 0) - (a.puntos_lealtad || 0);
            if (sortBy === 'registro') return new Date(b.fecha_registro) - new Date(a.fecha_registro);
            return 0;
        });

    function openCreateModal() {
        setEditingClient(null);
        setFormData({ nombre: '', telefono: '', notas: '' });
        setShowModal(true);
    }

    function openEditModal(cliente) {
        setEditingClient(cliente);
        setFormData({
            nombre: cliente.nombre,
            telefono: cliente.telefono || '',
            notas: cliente.notas || ''
        });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingClient) {
                await clientesService.update(editingClient.id, formData);
                toast.success('Cliente actualizado');
                setShowModal(false);
            } else {
                const res = await clientesService.create(formData);
                setShowModal(false);
                if (res.data && res.data.pin) {
                    setHandoffData({ nombre: formData.nombre, pin: res.data.pin });
                    setShowHandoffModal(true);
                } else {
                    toast.success('Cliente registrado');
                }
            }
            loadClientes();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al guardar');
        }
    }

    async function handleResetPin() {
        if (!editingClient) return;
        const confirmMsg = `¿Estás seguro que deseas sobreescribir la contraseña de ${editingClient.nombre}?\n\nSu antigua contraseña dejará de funcionar permanentemente.`;
        if (!window.confirm(confirmMsg)) return;

        setIsResettingPin(true);
        try {
            const res = await clientesService.resetPin(editingClient.id);
            setShowModal(false); 
            
            setHandoffData({ nombre: editingClient.nombre, pin: res.data.pin });
            setShowHandoffModal(true);
            
            toast.success('PIN reseteado exitosamente');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al resetear PIN');
        } finally {
            setIsResettingPin(false);
        }
    }

    async function handleDelete(id, nombre) {
        setDeleteTarget({ id, nombre });
        setShowDeleteConfirm(true);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        try {
            await clientesService.delete(deleteTarget.id);
            loadClientes();
            toast.success('Cliente desactivado');
        } catch (error) {
            toast.error('No se pudo desactivar');
        }
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    }

    function openStampModal(cliente) {
        setStampTarget(cliente);
        setShowStampModal(true);
    }

    async function handleAddStamp() {
        if (!stampTarget) return;
        setStampLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/loyalty/manual-stamp/${stampTarget.id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al agregar sello');
            
            toast.success(data.message || 'Sello agregado exitosamente');
            setShowStampModal(false);
            setStampTarget(null);
            loadClientes();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setStampLoading(false);
        }
    }

    function sendWhatsApp(cliente) {
        const phone = (cliente.telefono || '').replace(/\D/g, '');
        const phoneNumber = phone.startsWith('52') ? phone : `52${phone}`;
        const barberiaName = user?.barberia_nombre || 'la barbería';
        const message = encodeURIComponent(
            `¡Qué onda ${cliente.nombre}! 💈 Hace un rato que no te vemos por ${barberiaName}. ¿Te agendamos para esta semana?`
        );
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    }

    function getDaysSinceVisit(ultimaVisita) {
        if (!ultimaVisita) return null;
        const last = new Date(ultimaVisita);
        const now = new Date();
        return Math.floor((now - last) / (1000 * 60 * 60 * 24));
    }

    function getVisitBadge(ultimaVisita) {
        const days = getDaysSinceVisit(ultimaVisita);
        if (days === null) return <span className="cl-badge cl-badge-new">Nuevo</span>;
        if (days <= 7) return <span className="cl-badge cl-badge-recent">Hace {days}d</span>;
        if (days <= 30) return <span className="cl-badge cl-badge-normal">Hace {days}d</span>;
        return <span className="cl-badge cl-badge-inactive">{days}d sin venir</span>;
    }

    function getLoyaltyDisplay(puntos_lealtad) {
        const puntos = puntos_lealtad || 0;
        const maxPoints = 10;
        const filled = Math.min(puntos % maxPoints, maxPoints);
        const completedCards = Math.floor(puntos / maxPoints);
        return (
            <div className="cl-loyalty">
                <div className="cl-loyalty-bar">
                    <div className="cl-loyalty-fill" style={{ width: `${(filled / maxPoints) * 100}%` }}></div>
                </div>
                <span className="cl-loyalty-text">{filled}/{maxPoints}</span>
                {completedCards > 0 && (
                    <span className="cl-loyalty-cards">{completedCards} tarjeta{completedCards > 1 ? 's' : ''}</span>
                )}
            </div>
        );
    }

    function getRankBadge(id_rol_lealtad, nivel_lealtad, color_hex) {
        let finalColor = color_hex || '#e2725b';
        let icon = <Star size={14} />;
        
        if (nivel_lealtad) {
            const l = nivel_lealtad.toLowerCase();
            if (l.includes('oro') || l.includes('platino')) icon = <Crown size={14} />;
            else if (l.includes('plata')) icon = <Trophy size={14} />;
        }
        
        return (
            <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px', 
                padding: '4px 10px', 
                borderRadius: '12px', 
                background: finalColor,
                color: '#fff', 
                fontSize: '0.8rem', 
                fontWeight: 'bold', 
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                boxShadow: `0 4px 10px ${finalColor}66`, 
                border: '1px solid rgba(255,255,255,0.2)' 
            }}>
                {icon} {nivel_lealtad || 'Nivel General'}
            </span>
        );
    }

    // Stats (from full dataset)
    const totalClientes = clientes.length;
    const statNuevos = clientes.filter(c => getDaysSinceVisit(c.ultima_visita) === null).length;
    const statRecientes = clientes.filter(c => { const d = getDaysSinceVisit(c.ultima_visita); return d !== null && d <= 7; }).length;
    const statRegulares = clientes.filter(c => { const d = getDaysSinceVisit(c.ultima_visita); return d !== null && d > 7 && d <= 30; }).length;
    const statInactivos = clientes.filter(c => { const d = getDaysSinceVisit(c.ultima_visita); return d !== null && d > 30; }).length;
    const hasActiveFilters = filterActivity !== 'todos';
    const totalPages = Math.ceil(filteredClientes.length / perPage);
    const visibleClientes = filteredClientes.slice((currentPage - 1) * perPage, currentPage * perPage);

    return (
        <div className="clientes-page">
            {/* Header */}
            <div className="cl-header">
                <div>
                    <h1 className="cl-title">Directorio de Clientes</h1>
                    <p className="cl-subtitle">
                        {filteredClientes.length} de {totalClientes} cliente{totalClientes !== 1 ? 's' : ''}
                        {hasActiveFilters ? ' (filtrado)' : ''}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link to="/panel/lealtad" className="btn-secondary-pro" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Settings size={16} /> Ver Reglas de Nivel
                    </Link>
                    <button className="btn-primary-pro" onClick={openCreateModal}>
                        <Icon name="plus-lg" /> Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="cl-stats">
                <button className={`cl-stat-card ${filterActivity === 'todos' ? 'cl-stat-active-card' : ''}`} onClick={() => setFilterActivity('todos')}>
                    <div className="cl-stat-icon cl-stat-total"><Icon name="users" /></div>
                    <div>
                        <span className="cl-stat-number">{totalClientes}</span>
                        <span className="cl-stat-label">Total</span>
                    </div>
                </button>
                <button className={`cl-stat-card ${filterActivity === 'nuevos' ? 'cl-stat-active-card' : ''}`} onClick={() => setFilterActivity(filterActivity === 'nuevos' ? 'todos' : 'nuevos')}>
                    <div className="cl-stat-icon cl-stat-new"><Icon name="plus" /></div>
                    <div>
                        <span className="cl-stat-number">{statNuevos}</span>
                        <span className="cl-stat-label">Nuevos</span>
                    </div>
                </button>
                <button className={`cl-stat-card ${filterActivity === 'recientes' ? 'cl-stat-active-card' : ''}`} onClick={() => setFilterActivity(filterActivity === 'recientes' ? 'todos' : 'recientes')}>
                    <div className="cl-stat-icon cl-stat-active"><Icon name="check-circle" /></div>
                    <div>
                        <span className="cl-stat-number">{statRecientes}</span>
                        <span className="cl-stat-label">Recientes</span>
                    </div>
                </button>
                <button className={`cl-stat-card ${filterActivity === 'regulares' ? 'cl-stat-active-card' : ''}`} onClick={() => setFilterActivity(filterActivity === 'regulares' ? 'todos' : 'regulares')}>
                    <div className="cl-stat-icon cl-stat-regular"><Icon name="clock" /></div>
                    <div>
                        <span className="cl-stat-number">{statRegulares}</span>
                        <span className="cl-stat-label">Regulares</span>
                    </div>
                </button>
                <button className={`cl-stat-card ${filterActivity === 'inactivos' ? 'cl-stat-active-card' : ''}`} onClick={() => setFilterActivity(filterActivity === 'inactivos' ? 'todos' : 'inactivos')}>
                    <div className="cl-stat-icon cl-stat-warn"><Icon name="alert-circle" /></div>
                    <div>
                        <span className="cl-stat-number">{statInactivos}</span>
                        <span className="cl-stat-label">Inactivos</span>
                    </div>
                </button>
            </div>

            {/* Search & Filters */}
            <div className="cl-controls">
                <div className="cl-search">
                    <Icon name="search" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="cl-search-clear" onClick={() => setSearchQuery('')}>
                            <Icon name="x-lg" />
                        </button>
                    )}
                </div>
                <select
                    className="cl-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="nombre">Nombre A-Z</option>
                    <option value="puntos">Más puntos</option>
                    <option value="registro">Registrado reciente</option>
                </select>
            </div>

            {/* Active filters indicator */}
            {hasActiveFilters && (
                <div className="cl-active-filters">
                    <span>Filtros:</span>
                    {filterActivity !== 'todos' && (
                        <button className="cl-filter-tag" onClick={() => setFilterActivity('todos')}>
                            {filterActivity === 'nuevos' ? 'Nuevos' : filterActivity === 'recientes' ? 'Recientes ≤7d' : filterActivity === 'regulares' ? 'Regulares ≤30d' : 'Inactivos 30d+'}
                            <Icon name="x-lg" size={10} />
                        </button>
                    )}
                    <button className="cl-clear-filters" onClick={() => setFilterActivity('todos')}>
                        Limpiar todo
                    </button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : filteredClientes.length === 0 ? (
                <div className="cl-empty">
                    <div className="cl-empty-icon">
                        <Icon name={hasActiveFilters ? 'search' : 'users'} />
                    </div>
                    <h3>{hasActiveFilters ? 'Sin resultados para estos filtros' : 'No hay clientes registrados'}</h3>
                    <p>{hasActiveFilters ? 'Prueba ajustando los filtros o la búsqueda.' : 'Registra tu primer cliente con el botón de arriba.'}</p>
                </div>
            ) : (
                <div className="cl-list">
                    {visibleClientes.map(cliente => {
                        const inactive = getDaysSinceVisit(cliente.ultima_visita) > 30;
                        return (
                            <div key={cliente.id} className={`cl-card ${inactive ? 'cl-card-inactive' : ''}`}>
                                <div className="cl-card-main">
                                    <div className="cl-avatar">
                                        {cliente.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="cl-info">
                                        <div className="cl-name">{cliente.nombre}</div>
                                        {cliente.telefono && (
                                            <div className="cl-phone">
                                                <Icon name="phone" /> {cliente.telefono}
                                            </div>
                                        )}
                                        {cliente.notas && <div className="cl-notes">{cliente.notas}</div>}
                                    </div>
                                </div>
                                <div className="cl-card-meta">
                                    <div className="cl-meta-item">
                                        <span className="cl-meta-label">Estatus</span>
                                        {getRankBadge(cliente.nivel?.id, cliente.nivel?.nombre, cliente.nivel?.color_hex)}
                                    </div>
                                    <div className="cl-meta-item">
                                        <span className="cl-meta-label">Sellos ({cliente.puntos_lealtad || 0})</span>
                                        {getLoyaltyDisplay(cliente.puntos_lealtad)}
                                    </div>
                                    <div className="cl-meta-item">
                                        <span className="cl-meta-label">Última visita</span>
                                        {getVisitBadge(cliente.ultima_visita)}
                                    </div>
                                </div>
                                <div className="cl-card-actions">
                                    {(user?.rol === 'Admin' || user?.rol === 'Encargado') && (
                                        <button
                                            className="cl-action"
                                            style={{ backgroundColor: 'rgba(226, 114, 91, 0.1)', color: '#e2725b', border: '1px solid rgba(226, 114, 91, 0.2)' }}
                                            onClick={() => openStampModal(cliente)}
                                            title="Otorgar Sello Manual"
                                        >
                                            <Star size={16} />
                                        </button>
                                    )}
                                    <button
                                        className="cl-action cl-action-edit"
                                        onClick={() => openEditModal(cliente)}
                                        title="Editar"
                                    >
                                        <Icon name="edit" size={16} />
                                    </button>
                                    {cliente.telefono && (
                                        <button
                                            className="cl-action cl-action-wa"
                                            onClick={() => sendWhatsApp(cliente)}
                                            title="Enviar WhatsApp"
                                        >
                                            <Icon name="whatsapp" size={16} />
                                        </button>
                                    )}
                                    <button
                                        className="cl-action cl-action-delete"
                                        onClick={() => handleDelete(cliente.id, cliente.nombre)}
                                        title="Desactivar"
                                    >
                                        <Icon name="x-circle" size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="cl-pagination">
                    <button
                        className="cl-page-btn"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        Anterior
                    </button>
                    <div className="cl-page-numbers">
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                className={`cl-page-num ${currentPage === i + 1 ? 'active' : ''}`}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <button
                        className="cl-page-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {/* Modal Crear/Editar */}
            {showModal && createPortal(
                <div className="modal-overlay-pro">
                    <div className="modal-content-pro">
                        <div className="modal-header-pro">
                            <h2>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <Icon name="x-lg" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body-pro">
                                <div className="form-group-pro">
                                    <label>Nombre *</label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        placeholder="Nombre del cliente"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group-pro">
                                    <label><Icon name="whatsapp" /> Teléfono (WhatsApp)</label>
                                    <input
                                        type="tel"
                                        value={formData.telefono}
                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                        placeholder="Ej: 5512345678"
                                    />
                                </div>
                                <div className="form-group-pro">
                                    <label>Notas</label>
                                    <textarea
                                        value={formData.notas}
                                        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                        placeholder="Preferencias, observaciones..."
                                        rows="3"
                                    />
                                </div>
                                
                                {editingClient && (
                                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(226, 114, 91, 0.05)', borderRadius: '8px', border: '1px dashed rgba(226, 114, 91, 0.3)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Recuperación de Cuenta</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Genera un nuevo PIN si el cliente lo olvidó.</div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={handleResetPin}
                                                disabled={isResettingPin}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-primary)', color: 'white', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', border: 'none', cursor: 'pointer', opacity: isResettingPin ? 0.7 : 1, transition: 'all 0.2s' }}
                                            >
                                                🔑 {isResettingPin ? 'Generando...' : 'Resetear PIN'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-actions-pro">
                                <button type="button" className="btn-secondary-pro" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary-pro">
                                    {editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmModal
                open={showDeleteConfirm}
                title={`¿Desactivar a ${deleteTarget?.nombre}?`}
                message="El cliente no aparecerá en la lista pero sus datos se conservan."
                icon="🗑️"
                confirmText="Sí, desactivar"
                cancelText="Cancelar"
                danger
                onConfirm={confirmDelete}
                onCancel={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
            />

            {/* Modal Handoff PIN */}
            {showHandoffModal && handoffData && createPortal(
                <div className="modal-overlay-pro" style={{ zIndex: 9999 }}>
                    <div className="modal-content-pro" style={{ textAlign: 'center', padding: '2.5rem 2rem', maxWidth: '400px', border: '1px solid rgba(226, 114, 91, 0.3)', boxShadow: '0 0 30px rgba(0,0,0,0.8), 0 0 15px rgba(226, 114, 91, 0.2)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #4caf50, #2e7d32)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px rgba(76, 175, 80, 0.3)' }}>
                            <Icon name="check-lg" />
                        </div>
                        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 600 }}>¡Cliente Registrado!</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            La cuenta de <strong style={{color: 'var(--text-main)'}}>{handoffData.nombre}</strong> está lista para usarse.
                        </p>
                        
                        <div style={{ background: '#1a1d24', border: '2px dashed rgba(226, 114, 91, 0.5)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>PIN de Acceso Temporal</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '3px', textShadow: '0 0 10px rgba(226, 114, 91, 0.3)' }}>
                                {handoffData.pin}
                            </div>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(handoffData.pin); toast.success('PIN Copiado'); }}
                                style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
                                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <Copy size={14} /> Copiar PIN
                            </button>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
                            👉 Proporciona esta clave al cliente. <strong>Por seguridad, no se volverá a mostrar.</strong> Él podrá cambiarla por una privada desde su portal.
                        </div>

                        <button 
                            type="button" 
                            className="btn-primary-pro" 
                            style={{ width: '100%', background: 'linear-gradient(135deg, #e2725b, #b94e3a)', border: 'none' }}
                            onClick={() => setShowHandoffModal(false)}
                        >
                            Cerrar y Continuar
                        </button>
                    </div>
                </div>,
                document.body
            )}


            {/* Modal Sello Manual */}
            {showStampModal && stampTarget && createPortal(
                <div className="modal-overlay-pro" style={{ zIndex: 9999 }}>
                    <div className="modal-content-pro" style={{ textAlign: 'center', padding: '2.5rem 2rem', maxWidth: '400px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #e2725b, #b94e3a)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px rgba(226, 114, 91, 0.3)' }}>
                            <Star size={32} fill="white" />
                        </div>
                        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--text-main)', fontWeight: 600 }}>Sello de Lealtad</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Estás a punto de otorgarle un sello a <strong style={{color: 'var(--text-main)'}}>{stampTarget.nombre}</strong>.
                            <br/>Actualmente tiene <strong style={{color: 'var(--accent-primary)'}}>{stampTarget.puntos_lealtad || 0}</strong> sello(s).
                        </p>
                        
                        <div style={{ background: 'rgba(255, 171, 0, 0.1)', border: '1px solid rgba(255, 171, 0, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.85rem', color: '#ffb300', textAlign: 'left', display: 'flex', gap: '10px' }}>
                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                            <span>Esta acción ignorará la regla de 1 sello por día. El cliente será notificado.</span>
                        </div>

                        <div className="modal-actions-pro" style={{ justifyContent: 'center', gap: '1rem', marginTop: 0 }}>
                            <button 
                                type="button" 
                                className="btn-secondary-pro" 
                                onClick={() => setShowStampModal(false)}
                                disabled={stampLoading}
                                style={{ flex: 1 }}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                className="btn-primary-pro" 
                                style={{ background: 'linear-gradient(135deg, #e2725b, #b94e3a)', flex: 1, border: 'none' }}
                                onClick={handleAddStamp}
                                disabled={stampLoading}
                            >
                                {stampLoading ? 'Enviando...' : 'Otorgar Sello'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
