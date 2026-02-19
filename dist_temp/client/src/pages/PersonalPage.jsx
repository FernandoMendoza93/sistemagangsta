import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usuariosService, barberosService } from '../services/api';
import Icon from '../components/Icon';

export default function PersonalPage() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ nombre: '', email: '', password: '', id_rol: 3, turno: 'Completo' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [usuariosRes, rolesRes] = await Promise.all([
                usuariosService.getAll(),
                usuariosService.getRoles()
            ]);
            setUsuarios(usuariosRes.data);
            setRoles(rolesRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await usuariosService.create({ ...form, esBarbero: form.id_rol === 3 });
            setShowModal(false);
            setForm({ nombre: '', email: '', password: '', id_rol: 3, turno: 'Completo' });
            loadData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al crear usuario');
        }
    };

    const toggleActivo = async (id, activo) => {
        try {
            await usuariosService.update(id, { activo: activo ? 0 : 1 });
            loadData();
        } catch (error) {
            alert('Error al actualizar');
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div className="header-title-wrapper">
                    <div className="title-icon">
                        <Icon name="users" size={28} color="#2563eb" />
                    </div>
                    <h1 className="page-title">Personal</h1>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Icon name="plus" size={18} color="white" />
                    <span>Nuevo Usuario</span>
                </button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.id}>
                                    <td><strong>{u.nombre}</strong></td>
                                    <td>{u.email}</td>
                                    <td><span className={`badge ${u.rol === 'Admin' ? 'badge-warning' : u.rol === 'Encargado' ? 'badge-info' : 'badge-success'}`}>{u.rol}</span></td>
                                    <td><span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                                    <td>
                                        <button className="btn btn-secondary btn-sm" onClick={() => toggleActivo(u.id, u.activo)}>
                                            {u.activo ? 'Desactivar' : 'Activar'}
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
                            <h3 className="custom-modal-title">Nuevo Usuario</h3>
                            <button className="custom-modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="custom-modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nombre</label>
                                    <input className="form-input" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contraseña</label>
                                    <input type="password" className="form-input" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Rol</label>
                                    <select className="form-select" value={form.id_rol} onChange={e => setForm({ ...form, id_rol: parseInt(e.target.value) })}>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre_rol}</option>)}
                                    </select>
                                </div>
                                {form.id_rol === 3 && (
                                    <div className="form-group">
                                        <label className="form-label">Turno</label>
                                        <select className="form-select" value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value })}>
                                            <option value="Mañana">Mañana</option>
                                            <option value="Tarde">Tarde</option>
                                            <option value="Completo">Completo</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="custom-modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Crear Usuario</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
