import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
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
            toast.error(error.response?.data?.error || 'Error al guardar');
        }
    };

    const toggleActivo = async (id, activo) => {
        try {
            await serviciosService.update(id, { activo: activo ? 0 : 1 });
            loadData();
        } catch (error) {
            toast.error('Error al actualizar estado');
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div className="header-title-wrapper">
                    <div className="title-icon">
                        <Icon name="scissors" size={28} color="var(--accent-primary)" />
                    </div>
                    <h1 className="page-title">Servicios</h1>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Icon name="plus" size={18} color="white" />
                    <span>Nuevo Servicio</span>
                </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px var(--shadow-color)' }}>
                <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)' }}>
                        <thead>
                            <tr>
                                {['Servicio','Precio','Duración','Estado','Acciones'].map(h => (
                                    <th key={h} style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', padding: '0.75rem 1.25rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {servicios.map(s => (
                                <tr key={s.id}>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontWeight: 700 }}>{s.nombre_servicio}</td>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--accent-primary)', fontWeight: 600 }}>${s.precio.toFixed(2)}</td>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}>{s.duracion_aprox} min</td>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}><span className={`badge ${s.activo ? 'badge-success' : 'badge-danger'}`}>{s.activo ? 'Activo' : 'Inactivo'}</span></td>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.4rem 0.8rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => openModal(s)}>Editar</button>
                                        <button className="btn btn-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.4rem 0.8rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => toggleActivo(s.id, s.activo)}>
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
                <div className="custom-modal-overlay">
                    <div className="custom-modal">
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
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className="form-input" 
                                        required 
                                        placeholder="100.00" 
                                        value={form.precio} 
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => setForm({ ...form, precio: e.target.value })} 
                                    />
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
