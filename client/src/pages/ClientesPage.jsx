import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { clientesService } from '../services/api';
import Icon from '../components/Icon';
import './ClientesPage.css';

export default function ClientesPage() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState('todos'); // 'todos' | 'inactivos'
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', telefono: '', notas: '' });

    useEffect(() => {
        loadClientes();
    }, [filterMode]);

    // Debounce para búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            if (filterMode === 'todos') {
                loadClientes();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    async function loadClientes() {
        try {
            setLoading(true);
            let res;
            if (filterMode === 'inactivos') {
                res = await clientesService.getInactivos();
            } else {
                res = await clientesService.getAll(searchQuery || undefined);
            }
            setClientes(res.data);
        } catch (error) {
            console.error('Error cargando clientes:', error);
        } finally {
            setLoading(false);
        }
    }

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
                Swal.fire({ icon: 'success', title: 'Cliente actualizado', timer: 1500, showConfirmButton: false });
            } else {
                await clientesService.create(formData);
                Swal.fire({ icon: 'success', title: 'Cliente registrado', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            loadClientes();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.error || 'Error al guardar' });
        }
    }

    async function handleDelete(id, nombre) {
        const result = await Swal.fire({
            title: `¿Desactivar a ${nombre}?`,
            text: 'El cliente no aparecerá en la lista pero sus datos se conservan',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545'
        });

        if (result.isConfirmed) {
            try {
                await clientesService.delete(id);
                loadClientes();
                Swal.fire({ icon: 'success', title: 'Cliente desactivado', timer: 1500, showConfirmButton: false });
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo desactivar' });
            }
        }
    }

    function sendWhatsApp(cliente) {
        const phone = (cliente.telefono || '').replace(/\D/g, '');
        const phoneNumber = phone.startsWith('52') ? phone : `52${phone}`;
        const message = encodeURIComponent(
            `¡Qué onda ${cliente.nombre}! 💈 Hace un rato que no te vemos por The Gangsta Barber Shop. ¿Te agendamos para esta semana?`
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
        if (days === null) return <span className="badge-visit badge-new">Nuevo</span>;
        if (days <= 7) return <span className="badge-visit badge-recent">Hace {days}d</span>;
        if (days <= 30) return <span className="badge-visit badge-normal">Hace {days}d</span>;
        return <span className="badge-visit badge-inactive">⚠️ {days}d sin venir</span>;
    }

    function getLoyaltyDisplay(puntos) {
        const maxPoints = 10;
        const filled = Math.min(puntos % maxPoints, maxPoints);
        const completedCards = Math.floor(puntos / maxPoints);
        return (
            <div className="loyalty-display">
                <div className="loyalty-stamps">
                    {[...Array(maxPoints)].map((_, i) => (
                        <span key={i} className={`stamp ${i < filled ? 'filled' : ''}`}>★</span>
                    ))}
                </div>
                <span className="loyalty-count">{filled}/{maxPoints}</span>
                {completedCards > 0 && (
                    <span className="loyalty-cards">🎉 {completedCards} tarjeta{completedCards > 1 ? 's' : ''}</span>
                )}
            </div>
        );
    }

    return (
        <div className="clientes-page">
            {/* Header */}
            <div className="page-header-pro">
                <div className="header-left">
                    <h1><Icon name="people-fill" /> Directorio de Clientes</h1>
                    <p className="header-subtitle">
                        {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
                        {filterMode === 'inactivos' ? ' inactivos (+30 días)' : ''}
                    </p>
                </div>
                <button className="btn-primary-pro" onClick={openCreateModal}>
                    <Icon name="plus-lg" /> Nuevo Cliente
                </button>
            </div>

            {/* Search & Filters */}
            <div className="clientes-controls">
                <div className="search-box">
                    <Icon name="search" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button className="search-clear" onClick={() => setSearchQuery('')}>
                            <Icon name="x-lg" />
                        </button>
                    )}
                </div>
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filterMode === 'todos' ? 'active' : ''}`}
                        onClick={() => setFilterMode('todos')}
                    >
                        <Icon name="people" /> Todos
                    </button>
                    <button
                        className={`filter-tab ${filterMode === 'inactivos' ? 'active' : ''}`}
                        onClick={() => setFilterMode('inactivos')}
                    >
                        <Icon name="exclamation-triangle" /> Inactivos
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : clientes.length === 0 ? (
                <div className="empty-state">
                    <Icon name={filterMode === 'inactivos' ? 'check-circle' : 'people'} />
                    <h3>{filterMode === 'inactivos' ? '¡Todos tus clientes están activos!' : 'No hay clientes registrados'}</h3>
                    <p>{filterMode === 'inactivos' ? 'Ningún cliente lleva más de 30 días sin visitar.' : 'Registra tu primer cliente con el botón "Nuevo Cliente".'}</p>
                </div>
            ) : (
                <div className="table-container-pro">
                    <table className="table-pro">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Teléfono</th>
                                <th>Lealtad</th>
                                <th>Última Visita</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.map(cliente => (
                                <tr key={cliente.id} className={getDaysSinceVisit(cliente.ultima_visita) > 30 ? 'row-inactive' : ''}>
                                    <td>
                                        <div className="client-name-cell">
                                            <div className="client-avatar">
                                                {cliente.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <strong>{cliente.nombre}</strong>
                                                {cliente.notas && <small className="client-notes">{cliente.notas}</small>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {cliente.telefono ? (
                                            <span className="phone-display">
                                                <Icon name="phone" /> {cliente.telefono}
                                            </span>
                                        ) : (
                                            <span className="no-phone">Sin teléfono</span>
                                        )}
                                    </td>
                                    <td>{getLoyaltyDisplay(cliente.puntos_lealtad)}</td>
                                    <td>{getVisitBadge(cliente.ultima_visita)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon btn-edit"
                                                onClick={() => openEditModal(cliente)}
                                                title="Editar"
                                            >
                                                <Icon name="pencil" />
                                            </button>
                                            {cliente.telefono && (
                                                <button
                                                    className="btn-icon btn-whatsapp"
                                                    onClick={() => sendWhatsApp(cliente)}
                                                    title="Enviar WhatsApp"
                                                >
                                                    <Icon name="whatsapp" />
                                                </button>
                                            )}
                                            <button
                                                className="btn-icon btn-delete"
                                                onClick={() => handleDelete(cliente.id, cliente.nombre)}
                                                title="Desactivar"
                                            >
                                                <Icon name="trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
        </div>
    );
}
