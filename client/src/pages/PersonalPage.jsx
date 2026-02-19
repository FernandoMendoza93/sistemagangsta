import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { usuariosService, barberosService } from '../services/api';
import Icon from '../components/Icon';

export default function PersonalPage() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [form, setForm] = useState({ nombre: '', email: '', password: '', id_rol: 3, turno: 'Completo' });
    const [editForm, setEditForm] = useState({ id: null, nombre: '', email: '', password: '', id_rol: 3 });

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
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.error || 'Error al crear usuario', confirmButtonColor: '#c9a227' });
        }
    };

    const openEditModal = (usuario) => {
        setEditForm({
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            password: '',
            id_rol: usuario.id_rol
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                nombre: editForm.nombre,
                email: editForm.email,
                id_rol: editForm.id_rol
            };
            // Solo enviar password si se escribió una nueva
            if (editForm.password.trim()) {
                data.password = editForm.password;
            }
            await usuariosService.update(editForm.id, data);
            setShowEditModal(false);
            setEditForm({ id: null, nombre: '', email: '', password: '', id_rol: 3 });
            loadData();
            Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Usuario actualizado correctamente', confirmButtonColor: '#c9a227' });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.error || 'Error al actualizar usuario', confirmButtonColor: '#c9a227' });
        }
    };

    const toggleActivo = async (id, activo) => {
        try {
            await usuariosService.update(id, { activo: activo ? 0 : 1 });
            loadData();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error al actualizar', confirmButtonColor: '#c9a227' });
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
                                    <td><strong style={{ color: '#1a1a1a' }}>{u.nombre}</strong></td>
                                    <td style={{ color: '#1a1a1a' }}>{u.email}</td>
                                    <td><span className={`badge ${u.rol === 'Admin' ? 'badge-warning' : u.rol === 'Encargado' ? 'badge-info' : 'badge-success'}`}>{u.rol}</span></td>
                                    <td><span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                                    <td>
                                        <div className="acciones-cell">
                                            <button className="btn btn-primary btn-sm" onClick={() => openEditModal(u)} title="Editar usuario">
                                                <Icon name="edit" size={14} color="white" />
                                                <span>Editar</span>
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => toggleActivo(u.id, u.activo)}>
                                                {u.activo ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Nuevo Usuario */}
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

            {/* Modal Editar Usuario */}
            {showEditModal && createPortal(
                <div className="custom-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="custom-modal" onClick={e => e.stopPropagation()}>
                        <div className="custom-modal-header">
                            <h3 className="custom-modal-title">Editar Usuario</h3>
                            <button className="custom-modal-close" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="custom-modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nombre</label>
                                    <input className="form-input" required value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" required value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Rol</label>
                                    <select className="form-select" value={editForm.id_rol} onChange={e => setEditForm({ ...editForm, id_rol: parseInt(e.target.value) })}>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre_rol}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={editForm.password}
                                        onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                        placeholder="Dejar vacío para no cambiar"
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                                        Solo llenar si deseas cambiar la contraseña
                                    </small>
                                </div>
                            </div>
                            <div className="custom-modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
