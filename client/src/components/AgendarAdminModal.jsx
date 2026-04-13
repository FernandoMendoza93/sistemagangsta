import { useState, useEffect } from 'react';
import { X, User, PlusCircle, Calendar, Clock, Scissors, Search } from 'lucide-react';
import { citasService, clientesService, barberosService } from '../services/api';
import { toast } from 'sonner';

export default function AgendarAdminModal({ isOpen, onClose, onRefresh }) {
    const [esNuevoCliente, setEsNuevoCliente] = useState(false);
    const [clientes, setClientes] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [barberos, setBarberos] = useState([]);
    const [loading, setLoading] = useState(false);

    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const [form, setForm] = useState({
        id_cliente: '',
        cliente_nuevo_nombre: '',
        cliente_nuevo_tel: '',
        cliente_nuevo_password: '',
        id_servicio: '',
        id_barbero: '',
        fecha: new Date().toISOString().split('T')[0],
        hora: '10:00',
        notas: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            // Reset form
            setForm({
                id_cliente: '',
                cliente_nuevo_nombre: '',
                cliente_nuevo_tel: '',
                cliente_nuevo_password: '',
                id_servicio: '',
                id_barbero: '',
                fecha: new Date().toISOString().split('T')[0],
                hora: '10:00',
                notas: ''
            });
            setEsNuevoCliente(false);
        }
    }, [isOpen]);

    const loadInitialData = async () => {
        try {
            const [servRes, barRes, cliRes] = await Promise.all([
                citasService.getServiciosActivos(),
                citasService.getBarberos(), // Or barberosService.getAll()
                clientesService.getAll()
            ]);
            setServicios(servRes.data);
            setBarberos(barRes.data);
            setClientes(cliRes.data);
        } catch (error) {
            console.error('Error cargando datos para cita:', error);
            // Si citasService.getBarberos no existe, fallara
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                id_servicio: form.id_servicio,
                id_barbero: form.id_barbero,
                fecha: form.fecha,
                hora: form.hora,
                notas: form.notas,
                id_cliente: !esNuevoCliente ? form.id_cliente : undefined,
                cliente_nuevo: esNuevoCliente ? {
                    nombre: form.cliente_nuevo_nombre,
                    telefono: form.cliente_nuevo_tel,
                    password: form.cliente_nuevo_password
                } : undefined
            };

            await citasService.crearAdmin(payload);
            toast.success('Cita agendada exitosamente');
            onRefresh();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al agendar cita');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="custom-modal-overlay">
            <div className="custom-modal-content" style={{ maxWidth: '500px', width: '90%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 32px var(--shadow-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 700 }}><Calendar size={20}/> Nueva Cita (Staff)</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                            <button 
                                type="button" 
                                className={`btn ${!esNuevoCliente ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setEsNuevoCliente(false)}
                                style={{ flex: 1 }}
                            >
                                Cliente Existente
                            </button>
                            <button 
                                type="button" 
                                className={`btn ${esNuevoCliente ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setEsNuevoCliente(true)}
                                style={{ flex: 1 }}
                            >
                                Cliente Nuevo
                            </button>
                        </div>

                        {!esNuevoCliente ? (
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label><User size={16}/> Buscar Cliente</label>
                                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 0.5rem' }}>
                                    <Search size={18} color="var(--text-muted)" style={{ marginLeft: '0.5rem' }} />
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Ej. Juan Pérez..."
                                        style={{ border: 'none', background: 'transparent' }}
                                        value={busquedaCliente}
                                        onChange={(e) => {
                                            setBusquedaCliente(e.target.value);
                                            setShowDropdown(true);
                                            setForm({...form, id_cliente: ''}); // reset selection if typing
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                    />
                                    {form.id_cliente && (
                                        <div style={{ color: 'var(--success)', paddingRight: '0.5rem', display: 'flex', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Seleccionado ✓</span>
                                        </div>
                                    )}
                                </div>
                                
                                {showDropdown && busquedaCliente.trim().length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px var(--shadow-color)', marginTop: '4px' }}>
                                        {clientes.filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) || (c.telefono && c.telefono.includes(busquedaCliente))).map(c => (
                                            <div 
                                                key={c.id} 
                                                style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                                                onClick={() => {
                                                    setForm({...form, id_cliente: c.id});
                                                    setBusquedaCliente(`${c.nombre} ${c.telefono ? `(${c.telefono})` : ''}`);
                                                    setShowDropdown(false);
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <strong>{c.nombre}</strong> {c.telefono && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>- {c.telefono}</span>}
                                            </div>
                                        ))}
                                        {clientes.filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) || (c.telefono && c.telefono.includes(busquedaCliente))).length === 0 && (
                                            <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>No se encontraron clientes</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Nombre del Cliente</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Ej. Juan Pérez"
                                        value={form.cliente_nuevo_nombre}
                                        onChange={(e) => setForm({...form, cliente_nuevo_nombre: e.target.value})}
                                        required={esNuevoCliente}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Teléfono (Opcional)</label>
                                    <input 
                                        type="tel" 
                                        className="form-input" 
                                        placeholder="Ej. 5512345678"
                                        value={form.cliente_nuevo_tel}
                                        onChange={(e) => setForm({...form, cliente_nuevo_tel: e.target.value})}
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Asignar Contraseña 🔑</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Se usará para que él inicie sesión"
                                        value={form.cliente_nuevo_password}
                                        onChange={(e) => setForm({...form, cliente_nuevo_password: e.target.value})}
                                        required={esNuevoCliente}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label><Scissors size={16}/> Servicio</label>
                            <select 
                                className="form-input" 
                                value={form.id_servicio}
                                onChange={(e) => setForm({...form, id_servicio: e.target.value})}
                                required
                            >
                                <option value="">-- Seleccionar Servicio --</option>
                                {servicios.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre_servicio} (${s.precio})</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label><User size={16}/> Barbero</label>
                            <select 
                                className="form-input" 
                                value={form.id_barbero}
                                onChange={(e) => setForm({...form, id_barbero: e.target.value})}
                                required
                            >
                                <option value="">-- Seleccionar Barbero --</option>
                                {barberos.map(b => (
                                    <option key={b.id || b.id_barbero} value={b.id || b.id_barbero}>{b.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label><Calendar size={16}/> Fecha</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={form.fecha}
                                    onChange={(e) => setForm({...form, fecha: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label><Clock size={16}/> Hora</label>
                                <input 
                                    type="time" 
                                    className="form-input" 
                                    value={form.hora}
                                    onChange={(e) => setForm({...form, hora: e.target.value})}
                                    min="08:00"
                                    max="22:00"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Notas Adicionales (Opcional)</label>
                            <textarea 
                                className="form-input" 
                                rows="2"
                                value={form.notas}
                                onChange={(e) => setForm({...form, notas: e.target.value})}
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', fontSize: '1rem' }}
                        >
                            {loading ? 'Agendando...' : 'Confirmar Cita'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
