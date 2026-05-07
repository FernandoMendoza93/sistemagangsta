import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { usuariosService, barberosService } from '../services/api';
import Icon from '../components/Icon';

export default function PersonalPage() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [form, setForm] = useState({ nombre: '', email: '', password: '', id_rol: 3, turno: 'Completo', whatsapp: '', instagram: '' });
    const [editForm, setEditForm] = useState({ id: null, nombre: '', email: '', password: '', id_rol: 3, whatsapp: '', instagram: '', foto_url: '' });
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [saving, setSaving] = useState(false);

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
            const data = {
                ...form,
                whatsapp: form.id_rol === 3 ? form.whatsapp : null,
                instagram: form.id_rol === 3 ? form.instagram : null
            };
            await usuariosService.create(data);
            setShowModal(false);
            setForm({ nombre: '', email: '', password: '', id_rol: 3, turno: 'Completo', whatsapp: '', instagram: '' });
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al crear usuario');
        }
    };

    const openEditModal = (usuario) => {
        setEditForm({
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            password: '',
            id_rol: usuario.id_rol,
            whatsapp: usuario.whatsapp || '',
            instagram: usuario.instagram || '',
            foto_url: usuario.foto_url || ''
        });
        setFotoPreview(usuario.foto_url || null);
        setFotoFile(null);
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('nombre', editForm.nombre);
            formData.append('email', editForm.email);
            formData.append('id_rol', editForm.id_rol);
            
            if (editForm.id_rol === 3) {
                formData.append('whatsapp', editForm.whatsapp || '');
                formData.append('instagram', editForm.instagram || '');
                if (editForm.foto_url) {
                    formData.append('foto_url', editForm.foto_url);
                }
            }

            if (editForm.password.trim()) {
                formData.append('password', editForm.password);
            }

            if (fotoFile) {
                formData.append('foto', fotoFile);
            }

            await usuariosService.update(editForm.id, formData);
            
            setShowEditModal(false);
            setEditForm({ id: null, nombre: '', email: '', password: '', id_rol: 3, whatsapp: '', instagram: '', foto_url: '' });
            setFotoFile(null);
            setFotoPreview(null);
            loadData();
            toast.success('Usuario actualizado correctamente');
        } catch (error) {
            console.error('Error:', error);
            toast.error(error.response?.data?.error || 'Error al actualizar usuario');
        } finally {
            setSaving(false);
        }
    };

    const handleFotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFotoFile(file);
            setFotoPreview(URL.createObjectURL(file));
        }
    };

    const toggleActivo = async (id, activo) => {
        try {
            await usuariosService.update(id, { activo: activo ? 0 : 1 });
            loadData();
        } catch (error) {
            toast.error('Error al actualizar');
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div className="header-title-wrapper">
                    <div className="title-icon">
                        <Icon name="users" size={28} color="var(--accent-primary)" />
                    </div>
                    <h1 className="page-title">Personal</h1>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Icon name="plus" size={18} color="white" />
                    <span>Nuevo Usuario</span>
                </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px var(--shadow-color)' }}>
                <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)' }}>
                        <thead>
                            <tr>
                                {['Nombre','Email','Rol','Estado','Acciones'].map(h => (
                                    <th key={h} style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', padding: '0.75rem 1.25rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.id}>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontWeight: 700 }}>{u.nombre}</td>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}>{u.email}</td>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}><span className={`badge ${u.rol === 'Admin' ? 'badge-warning' : u.rol === 'Encargado' ? 'badge-info' : 'badge-success'}`}>{u.rol}</span></td>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}><span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                                    <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <button className="btn btn-primary btn-sm" onClick={() => openEditModal(u)} title="Editar usuario">
                                                <Icon name="edit" size={14} color="white" />
                                                <span>Editar</span>
                                            </button>
                                            <button className="btn btn-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.4rem 0.8rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => toggleActivo(u.id, u.activo)}>
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
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Turno</label>
                                            <select className="form-select" value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value })}>
                                                <option value="Mañana">Mañana</option>
                                                <option value="Tarde">Tarde</option>
                                                <option value="Completo">Completo</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">WhatsApp de Contacto (Opcional)</label>
                                            <input type="tel" className="form-input" placeholder="Ej: 529511234567" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Instagram (sin @)</label>
                                            <input type="text" className="form-input" placeholder="ej: flow_barber" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} />
                                        </div>
                                    </>
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
                                {editForm.id_rol === 3 && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">WhatsApp de Contacto (Opcional)</label>
                                            <input type="tel" className="form-input" placeholder="Ej: 529511234567" value={editForm.whatsapp} onChange={e => setEditForm({ ...editForm, whatsapp: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Instagram (sin @)</label>
                                            <input type="text" className="form-input" placeholder="ej: flow_barber" value={editForm.instagram} onChange={e => setEditForm({ ...editForm, instagram: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Foto del Barbero</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                {fotoPreview ? (
                                                    <img src={fotoPreview} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
                                                ) : (
                                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                                        {editForm.nombre?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <input type="file" accept="image/*" onChange={handleFotoChange} style={{ fontSize: '0.8rem' }} />
                                            </div>
                                        </div>
                                    </>
                                )}
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
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={saving}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
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
