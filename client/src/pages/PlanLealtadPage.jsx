import React, { useState, useEffect } from 'react';
import { Award, Plus, Trash2, Edit2, Info, Star, Save, Users, Crown, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import './PlanLealtadPage.css';

export default function PlanLealtadPage() {
    const { token } = useAuth();
    const [niveles, setNiveles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const [form, setForm] = useState({
        nombre_nivel: '',
        dias_max_frecuencia: '',
        porcentaje_descuento: '0',
        premio_descripcion: '',
        color_hex: '#e2725b'
    });

    useEffect(() => {
        fetchNiveles();
    }, []);

    const fetchNiveles = async () => {
        try {
            const res = await fetch('/api/lealtad/niveles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNiveles(data);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar la configuración de lealtad');
        } finally {
            setLoading(false);
        }
    };

    const handleNumberInput = (e) => {
        let value = e.target.value.replace(/[^0-9.]/g, '');
        // Prevent multiple dots
        const parts = value.split('.');
        if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
        setForm({ ...form, [e.target.name]: value });
    };

    const handleFocus = (e) => e.target.select();

    const startEditing = (nivel) => {
        setForm({
            nombre_nivel: nivel.nombre_nivel,
            dias_max_frecuencia: nivel.dias_max_frecuencia.toString(),
            porcentaje_descuento: nivel.porcentaje_descuento ? nivel.porcentaje_descuento.toString() : '0',
            premio_descripcion: nivel.premio_descripcion || '',
            color_hex: nivel.color_hex || '#e2725b'
        });
        setEditingId(nivel.id_rol_lealtad);
        setIsCreating(false);
    };

    const startCreating = () => {
        setForm({
            nombre_nivel: '',
            dias_max_frecuencia: '',
            porcentaje_descuento: '0',
            premio_descripcion: '',
            color_hex: '#e2725b'
        });
        setEditingId(null);
        setIsCreating(true);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsCreating(false);
    };

    const handleSubmit = async (e, id_rol_lealtad = null) => {
        e.preventDefault();
        if (!form.nombre_nivel || !form.dias_max_frecuencia) {
            return toast.warning('Nombre y Días de frecuencia son obligatorios.');
        }

        setIsSubmitting(true);
        try {
            const url = id_rol_lealtad ? `/api/lealtad/niveles/${id_rol_lealtad}` : '/api/lealtad/niveles';
            const method = id_rol_lealtad ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(id_rol_lealtad ? 'Nivel actualizado' : 'Nivel creado exitosamente');
                
                if (data.clientes_afectados !== undefined) {
                    toast.info(`¡Listo! ${data.clientes_afectados} clientes han cambiado de rango debido al rediseño.`);
                }
                
                cancelEdit();
                fetchNiveles();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al guardar');
            }
        } catch (error) {
            toast.error('Error de red al guardar el nivel');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar este nivel? Los clientes asociados perderán este estado.')) return;
        
        try {
            const res = await fetch(`/api/lealtad/niveles/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('Nivel eliminado');
                fetchNiveles();
            } else {
                toast.error('Error al eliminar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    const getIconForLevel = (nombre) => {
        const estatus = nombre.toLowerCase();
        if (estatus.includes('oro') || estatus.includes('platino')) return <Crown className="text-champagne" size={26} />;
        if (estatus.includes('plata')) return <Trophy className="text-gray-300" size={26} />;
        return <Star className="text-gold" size={26} />;
    };

    return (
        <div className="lealtad-container fade-in">
            {isSubmitting && (
                <div className="portal-loading" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="loading-spinner-box" style={{ padding: 0, background: 'transparent', boxShadow: 'none' }}></div>
                    <div className="spinner" style={{ borderTopColor: '#e0ba80', borderLeftColor: '#e0ba80', width: '40px', height: '40px' }}></div>
                    <p style={{ marginTop: '1rem', color: 'white', fontWeight: 600 }}>Calculando y sincronizando clientes...</p>
                </div>
            )}
            
            <header className="lealtad-header">
                <div>
                    <h1>Configuración Central de Lealtad</h1>
                    <p>Diseña las reglas del algoritmo. Al guardar, el sistema reclasificará automáticamente a tus clientes en el rango óptimo según su última visita.</p>
                </div>
                <button className="btn-primary-pro" onClick={startCreating} disabled={isCreating}>
                    <Plus size={18} /> Nuevo Rango
                </button>
            </header>

            <div className="niveles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                
                {/* Loader or Empty State */}
                {loading && <div className="loading-spinner-box">Cargando rangos...</div>}
                
                {!loading && niveles.length === 0 && !isCreating && (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <Info size={32} className="text-muted" />
                        <p>No hay rangos de lealtad definidos en tu Barbería.</p>
                    </div>
                )}

                {/* Formulario de Card Nueva */}
                {isCreating && (
                    <div className="bento-card bento-col-span-1 glassmorphism card-gradient" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="bento-card-header">
                            <Plus className="text-gold" size={24} />
                            <h3>Crear Rango</h3>
                            <button className="modal-close" onClick={cancelEdit} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={(e) => handleSubmit(e, null)} className="bento-form" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div className="form-group">
                                <label>Nombre (Ej: ORO VIP)</label>
                                <input type="text" name="nombre_nivel" className="styled-input uppercase-input" required value={form.nombre_nivel} onChange={(e) => setForm({...form, nombre_nivel: e.target.value})} />
                            </div>
                            <div className="form-group flex-row" style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{flex: 1}}>
                                    <label>Frecuencia Máx.</label>
                                    <div className="input-with-icon">
                                        <input type="text" name="dias_max_frecuencia" className="styled-input" placeholder="Ej. 15" required value={form.dias_max_frecuencia} onChange={handleNumberInput} />
                                        <span className="input-addon">Días</span>
                                    </div>
                                </div>
                                <div style={{flex: 1}}>
                                    <label>Descuento</label>
                                    <div className="input-with-icon">
                                        <input type="text" name="porcentaje_descuento" className="styled-input" placeholder="0" value={form.porcentaje_descuento} onChange={handleNumberInput} />
                                        <span className="input-addon">%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group flex-row" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <div style={{flex: 1}}>
                                    <label>Premio Base</label>
                                    <input type="text" name="premio_descripcion" className="styled-input" placeholder="Ej: 1 Corte Gratis" value={form.premio_descripcion} onChange={(e) => setForm({...form, premio_descripcion: e.target.value})} />
                                </div>
                                <div>
                                    <label>Color Insignia</label>
                                    <div style={{ padding: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex' }}>
                                        <input type="color" name="color_hex" value={form.color_hex} onChange={(e) => setForm({...form, color_hex: e.target.value})} style={{ width: '40px', height: '36px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} title="Elegir color" />
                                    </div>
                                </div>
                            </div>
                            
                            <button type="submit" className="btn-primary-pro glowing-shadow" style={{ marginTop: 'auto', paddingTop: '0.75rem', paddingBottom: '0.75rem' }} disabled={isSubmitting}>
                                {isSubmitting ? <span className="spinner" style={{width: 20, height: 20, borderWidth: 2}}></span> : <><Save size={18} /> Guardar</>}
                            </button>
                        </form>
                    </div>
                )}

                {/* Listado de Tarjetas Reales */}
                {niveles.map((nivel) => (
                    <div key={nivel.id_rol_lealtad} className="bento-card bento-col-span-1 glassmorphism" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        {editingId === nivel.id_rol_lealtad ? (
                            /* MODO EDICIÓN INLINE */
                            <>
                                <div className="bento-card-header">
                                    <Edit2 className="text-champagne" size={24} />
                                    <h3>Editando: {nivel.nombre_nivel}</h3>
                                    <button className="modal-close" onClick={cancelEdit} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <form onSubmit={(e) => handleSubmit(e, nivel.id_rol_lealtad)} className="bento-form" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div className="form-group">
                                        <label>Nombre del Rango</label>
                                        <input type="text" name="nombre_nivel" className="styled-input uppercase-input" required value={form.nombre_nivel} onChange={(e) => setForm({...form, nombre_nivel: e.target.value})} />
                                    </div>
                                    <div className="form-group flex-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{flex: 1}}>
                                            <label>Visitas cada (Máx)</label>
                                            <div className="input-with-icon">
                                                <input type="text" name="dias_max_frecuencia" className="styled-input" required value={form.dias_max_frecuencia} onChange={handleNumberInput} />
                                                <span className="input-addon">Días</span>
                                            </div>
                                        </div>
                                        <div style={{flex: 1}}>
                                            <label>Descuento Fijo</label>
                                            <div className="input-with-icon">
                                                <input type="text" name="porcentaje_descuento" className="styled-input" value={form.porcentaje_descuento} onChange={handleNumberInput} />
                                                <span className="input-addon">%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group flex-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{flex: 1}}>
                                            <label>Premio Especial</label>
                                            <textarea name="premio_descripcion" className="styled-input" rows="2" value={form.premio_descripcion} onChange={(e) => setForm({...form, premio_descripcion: e.target.value})} style={{resize: 'none', minHeight: '60px'}}></textarea>
                                        </div>
                                        <div>
                                            <label>Color Insignia</label>
                                            <div style={{ padding: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex' }}>
                                                <input type="color" name="color_hex" value={form.color_hex} onChange={(e) => setForm({...form, color_hex: e.target.value})} style={{ width: '40px', height: '52px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} title="Elegir color" />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '1rem' }}>
                                        <button type="submit" className="btn-bento-primary" style={{ flex: 1 }}>Actualizar</button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            /* MODO VISTA NORMAL */
                            <>
                                <div className="bento-card-header" style={{ justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {getIconForLevel(nivel.nombre_nivel)}
                                        <h3 style={{ fontSize: '1.25rem', color: nivel.color_hex || 'inherit' }}>{nivel.nombre_nivel}</h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => startEditing(nivel)} className="action-btn-edit" title="Editar" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '6px', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(nivel.id_rol_lealtad)} className="action-btn-delete" title="Eliminar" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: '6px', borderRadius: '6px', color: '#EF4444', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="bento-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Frecuencia de Visita</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>Cada {nivel.dias_max_frecuencia} días (o menos)</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Descuento Directo</span>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#10B981' }}>{Number(nivel.porcentaje_descuento)}% OFF</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                        <span style={{ fontSize: '0.85rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Recompensa / Premio</span>
                                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.4' }}>{nivel.premio_descripcion || 'No aplica premio específico'}</p>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                                        <Users size={16} />
                                        <span style={{ fontWeight: 600 }}>{nivel.clientes_activos} clientes activos</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
