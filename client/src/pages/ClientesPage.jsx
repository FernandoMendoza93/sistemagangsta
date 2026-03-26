import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
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
            } else {
                await clientesService.create(formData);
                toast.success('Cliente registrado');
            }
            setShowModal(false);
            loadClientes();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al guardar');
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

    function getLoyaltyDisplay(puntos) {
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
                <button className="btn-primary-pro" onClick={openCreateModal}>
                    <Icon name="plus-lg" /> Nuevo Cliente
                </button>
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
                                        <span className="cl-meta-label">Lealtad</span>
                                        {getLoyaltyDisplay(cliente.puntos_lealtad)}
                                    </div>
                                    <div className="cl-meta-item">
                                        <span className="cl-meta-label">Última visita</span>
                                        {getVisitBadge(cliente.ultima_visita)}
                                    </div>
                                </div>
                                <div className="cl-card-actions">
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
                <div className="modal-overlay-pro" onClick={() => setShowModal(false)}>
                    <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
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
        </div>
    );
}
