import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { serviciosService } from '../services/api';
import Icon from '../components/Icon';

export default function ServiciosPage() {
    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ nombre_servicio: '', precio: '', duracion_aprox: 30 });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await serviciosService.getAll();
            setServicios(res.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (servicio = null) => {
        if (servicio) {
            setEditing(servicio);
            setForm({ nombre_servicio: servicio.nombre_servicio, precio: servicio.precio, duracion_aprox: servicio.duracion_aprox });
        } else {
            setEditing(null);
            setForm({ nombre_servicio: '', precio: '', duracion_aprox: 30 });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await serviciosService.update(editing.id, { ...form, precio: parseFloat(form.precio) });
            } else {
                await serviciosService.create({ ...form, precio: parseFloat(form.precio) });
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error');
        }
    };

    const toggleActivo = async (id, activo) => {
        try {
            await serviciosService.update(id, { activo: activo ? 0 : 1 });
            loadData();
        } catch (error) {
            alert('Error');
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div className="header-title-wrapper">
                    <div className="title-icon">
                        <Icon name="scissors" size={28} color="#2563eb" />
                    </div>
                    <h1 className="page-title">Servicios</h1>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Icon name="plus" size={18} color="white" />
                    <span>Nuevo Servicio</span>
                </button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr><th>Servicio</th><th>Precio</th><th>Duración</th><th>Estado</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            {servicios.map(s => (
                                <tr key={s.id}>
                                    <td><strong>{s.nombre_servicio}</strong></td>
                                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>${s.precio.toFixed(2)}</td>
                                    <td>{s.duracion_aprox} min</td>
                                    <td><span className={`badge ${s.activo ? 'badge-success' : 'badge-danger'}`}>{s.activo ? 'Activo' : 'Inactivo'}</span></td>
                                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => openModal(s)}>Editar</button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => toggleActivo(s.id, s.activo)}>
                                            {s.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && createPortal(
                <div className="custom-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="custom-modal" onClick={e => e.stopPropagation()}>
                        <div className="custom-modal-header">
                            <h3 className="custom-modal-title">{editing ? 'Editar' : 'Nuevo'} Servicio</h3>
                            <button className="custom-modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="custom-modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nombre del Servicio</label>
                                    <input className="form-input" required placeholder="Ej: Corte Clásico" value={form.nombre_servicio} onChange={e => setForm({ ...form, nombre_servicio: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Precio ($)</label>
                                    <input type="number" step="0.01" className="form-input" required placeholder="100.00" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Duración Aproximada (minutos)</label>
                                    <input type="number" className="form-input" value={form.duracion_aprox} onChange={e => setForm({ ...form, duracion_aprox: parseInt(e.target.value) || 30 })} />
                                </div>
                            </div>
                            <div className="custom-modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Guardar' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
