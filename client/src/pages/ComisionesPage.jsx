import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { barberosService } from '../services/api';

export default function ComisionesPage() {
    const [barberos, setBarberos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBarbero, setSelectedBarbero] = useState(null);
    const [comisionesData, setComisionesData] = useState(null);
    const [historialPagos, setHistorialPagos] = useState([]);
    const [payingWeek, setPayingWeek] = useState(null); // To track which week is being paid
    const [payingAll, setPayingAll] = useState(false);
    const [expandedWeeks, setExpandedWeeks] = useState(new Set());
    const [semanasDesglosadas, setSemanasDesglosadas] = useState({}); // { semanaId: [ {fecha, items, subtotal} ] }
    const [loadingDesglose, setLoadingDesglose] = useState(null); // ID de la semana cargando
    const [editandoComision, setEditandoComision] = useState(null);
    const [nuevoValor, setNuevoValor] = useState('');

    useEffect(() => { loadBarberos(); }, []);

    useEffect(() => {
        if (selectedBarbero) {
            loadComisiones(selectedBarbero.id);
        }
    }, [selectedBarbero]);

    const loadBarberos = async () => {
        try {
            const res = await barberosService.getAll();
            setBarberos(res.data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar barberos');
        } finally {
            setLoading(false);
        }
    };

    const loadComisiones = async (id) => {
        try {
            const [comRes, histRes] = await Promise.all([
                barberosService.getComisiones(id), // Removed global desde/hasta
                barberosService.getHistorialPagos(id)
            ]);
            setComisionesData(comRes.data);
            setHistorialPagos(histRes.data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar detalles del barbero');
        }
    };

    const pagarComisionesSemana = async (semana) => {
        if (!selectedBarbero) return;
        setPayingWeek(semana.semana_id);
        try {
            const res = await barberosService.pagarComisiones(
                selectedBarbero.id, 
                `Pago semana ${semana.semana_inicio} a ${semana.semana_fin}`,
                semana.semana_inicio,
                semana.semana_fin
            );
            toast.success(`¡Pago Realizado! Se liquidó la semana por $${res.data.monto.toFixed(2)}`);
            loadComisiones(selectedBarbero.id);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al pagar semana');
        } finally {
            setPayingWeek(null);
        }
    };

    const pagarTodo = async () => {
        if (!selectedBarbero) return;
        setPayingAll(true);
        try {
            const res = await barberosService.pagarComisiones(selectedBarbero.id, 'Pago total de comisiones pendientes');
            toast.success(`¡Pago Total Realizado! Se pagaron $${res.data.monto.toFixed(2)}`);
            loadComisiones(selectedBarbero.id);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al pagar todo');
        } finally {
            setPayingAll(false);
        }
    };

    const toggleExpand = async (semana) => {
        const semanaId = semana.semana_id;
        
        if (expandedWeeks.has(semanaId)) {
            setExpandedWeeks(prev => {
                const next = new Set(prev);
                next.delete(semanaId);
                return next;
            });
            return;
        }

        // Si no tenemos los datos de esta semana, los cargamos día por día
        if (!semanasDesglosadas[semanaId]) {
            await cargarDesgloseSemana(semana);
        }

        setExpandedWeeks(prev => new Set(prev).add(semanaId));
    };

    const handleEditarComision = (barbero) => {
        setEditandoComision(barbero.id);
        setNuevoValor((barbero.porcentaje_comision * 100).toFixed(0));
    };

    const handleGuardarComision = async (barbero) => {
        if (!nuevoValor || nuevoValor < 1 || nuevoValor > 100) return;
        
        try {
            await barberosService.updateComision(barbero.id, parseFloat(nuevoValor) / 100);
            
            setBarberos(prev => prev.map(b => 
                b.id === barbero.id 
                    ? { ...b, porcentaje_comision: parseFloat(nuevoValor) / 100 }
                    : b
            ));
            
            if (selectedBarbero && selectedBarbero.id === barbero.id) {
                setSelectedBarbero(prev => ({ ...prev, porcentaje_comision: parseFloat(nuevoValor) / 100 }));
            }
            
            setEditandoComision(null);
            toast.success('Comisión actualizada');
        } catch (error) {
            toast.error('Error al actualizar comisión');
        }
    };

    const cargarDesgloseSemana = async (semana) => {
        if (!selectedBarbero) return;
        
        setLoadingDesglose(semana.semana_id);
        try {
            const dias = [];
            // Usamos mediodía para evitar problemas de redondeo de fecha al iterar
            let current = new Date(`${semana.semana_inicio}T12:00:00`);
            const fin = new Date(`${semana.semana_fin}T12:00:00`);

            while (current <= fin) {
                const fechaKey = current.toLocaleDateString('en-CA', {
                    timeZone: 'America/Mexico_City'
                });

                // Consultamos el backend filtrado por día real (ya con CONVERT_TZ)
                const res = await barberosService.getComisiones(selectedBarbero.id, { fecha: fechaKey });
                const data = res.data.comisiones || [];

                if (data.length > 0) {
                    dias.push({
                        fecha: fechaKey,
                        nombreDia: new Date(`${fechaKey}T12:00:00`).toLocaleDateString('es-MX', {
                            timeZone: 'America/Mexico_City',
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                        }).toUpperCase(),
                        items: data,
                        subtotal: data.reduce((sum, i) => sum + parseFloat(i.monto), 0)
                    });
                }
                current.setDate(current.getDate() + 1);
            }

            setSemanasDesglosadas(prev => ({
                ...prev,
                [semana.semana_id]: dias
            }));
        } catch (error) {
            console.error('Error cargando desglose:', error);
            toast.error('Error al cargar el detalle de la semana');
        } finally {
            setLoadingDesglose(null);
        }
    };



    const cardStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px var(--shadow-color)' };
    
    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    // Filtrar solo las semanas que tienen pendiente de pago, ordenar de más antigua a más nueva
    const semanasPendientes = (comisionesData?.resumen_semanal || [])
        .filter(s => s.pendiente > 0)
        .sort((a, b) => new Date(a.semana_inicio) - new Date(b.semana_inicio));

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="page-title">💎 Comisiones</h1>
            </div>

            <div className="card-grid comisiones-layout">
                {/* Lista de Barberos (Sidebar Izquierdo) */}
                <div style={cardStyle}>
                    <h2 style={{ margin: 0, marginBottom: '1rem', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>Barberos</h2>
                    {barberos.map(b => (
                        <div
                            key={b.id}
                            onClick={() => setSelectedBarbero(b)}
                            style={{
                                padding: '1rem',
                                background: selectedBarbero?.id === b.id ? 'rgba(201, 162, 39, 0.1)' : 'var(--bg-input)',
                                borderRadius: '12px',
                                marginBottom: '0.5rem',
                                cursor: 'pointer',
                                border: selectedBarbero?.id === b.id ? '1px solid var(--accent-primary)' : '1px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <strong style={{ color: 'var(--text-main)' }}>{b.nombre}</strong>
                            {editandoComision === b.id ? (
                                <div className="comision-edit-inline" onClick={e => e.stopPropagation()} style={{ marginTop: '0.25rem' }}>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={nuevoValor}
                                        onChange={e => setNuevoValor(e.target.value)}
                                        autoFocus
                                    />
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>%</span>
                                    <button onClick={() => handleGuardarComision(b)}>✓</button>
                                    <button onClick={() => setEditandoComision(null)}>✕</button>
                                </div>
                            ) : (
                                <div className="comision-display" style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    <span>Comisión: {(b.porcentaje_comision * 100).toFixed(0)}%</span>
                                    <button 
                                        className="comision-edit-btn"
                                        onClick={(e) => { e.stopPropagation(); handleEditarComision(b); }}
                                        title="Editar comisión"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Área Principal (Detalle) */}
                <div style={cardStyle}>
                    {!selectedBarbero ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                            Selecciona un barbero para ver sus comisiones
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            
                            {/* BLOQUE A — Header del barbero */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                <div>
                                    <h2 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                                        {selectedBarbero.nombre}
                                    </h2>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        Nivel de Comisión: <strong>{(selectedBarbero.porcentaje_comision * 100).toFixed(0)}%</strong>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ 
                                        display: 'inline-block', 
                                        padding: '0.35rem 0.8rem', 
                                        background: semanasPendientes.length > 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
                                        color: semanasPendientes.length > 0 ? '#eab308' : '#22c55e', 
                                        borderRadius: '20px', 
                                        fontWeight: 700, 
                                        fontSize: '0.85rem',
                                        border: `1px solid ${semanasPendientes.length > 0 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                                    }}>
                                        {semanasPendientes.length > 0 
                                            ? `${semanasPendientes.length} semana${semanasPendientes.length > 1 ? 's' : ''} pendiente${semanasPendientes.length > 1 ? 's' : ''}`
                                            : 'Todo al día ✓'}
                                    </div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                        Deuda Total: <span style={{ color: 'var(--warning)' }}>${(comisionesData?.totales?.pendiente || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* BLOQUE B — Semanas pendientes (Cards) */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 700 }}>
                                    Liquidaciones Pendientes
                                </h3>
                                
                                {semanasPendientes.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-input)', borderRadius: '12px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                                        No hay pagos pendientes para este barbero.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {semanasPendientes.map((semana) => {
                                            const options = { weekday: 'short', day: 'numeric', month: 'short' };
                                            const startStr = new Date(semana.semana_inicio).toLocaleDateString('es-MX', options);
                                            const endStr = new Date(semana.semana_fin).toLocaleDateString('es-MX', options);
                                            const isPayingThis = payingWeek === semana.semana_id;

                                            return (
                                                <div key={semana.semana_id} 
                                                    style={{ 
                                                        background: 'var(--bg-input)', 
                                                        border: '1px solid var(--border-color)', 
                                                        borderRadius: '16px', 
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        overflow: 'hidden',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => toggleExpand(semana)}
                                                >
                                                    {/* Header Card */}
                                                    <div style={{
                                                        padding: '1.5rem',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        flexWrap: 'wrap',
                                                        gap: '1rem',
                                                        background: expandedWeeks.has(semana.semana_id) ? 'rgba(0,0,0,0.1)' : 'transparent'
                                                    }}>
                                                        <div>
                                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span>{expandedWeeks.has(semana.semana_id) ? '▼' : '▶'}</span>
                                                                Semana {semana.semana_id.toString().slice(-2)}
                                                            </div>
                                                            <div style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                                                {startStr} — {endStr}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                <span>✂️ {semana.servicios} Servicios</span>
                                                                <span>📦 {semana.productos} Productos</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>
                                                                    ${parseFloat(semana.pendiente).toFixed(2)}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total a Pagar</div>
                                                            </div>
                                                            
                                                            <button 
                                                                className="btn btn-primary" 
                                                                style={{ padding: '0.75rem 1.5rem', minWidth: '140px' }}
                                                                onClick={(e) => { e.stopPropagation(); pagarComisionesSemana(semana); }}
                                                                disabled={isPayingThis || payingAll}
                                                            >
                                                                {isPayingThis ? 'Procesando...' : `Pagar Semana`}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Desglose Expandido */}
                                                    {expandedWeeks.has(semana.semana_id) && (
                                                        <div style={{
                                                            padding: '1.5rem',
                                                            background: 'var(--bg-surface)',
                                                            borderTop: '1px solid var(--border-color)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '1.5rem'
                                                        }}>
                                                            {loadingDesglose === semana.semana_id ? (
                                                                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                                                                    <div className="spinner" style={{ width: '20px', height: '20px', margin: '0 auto 10px' }}></div>
                                                                    Cargando desglose diario...
                                                                </div>
                                                            ) : (semanasDesglosadas[semana.semana_id] || []).map((dia) => (
                                                                <div key={dia.nombreDia}>
                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.75rem', paddingLeft: '1rem' }}>
                                                                        {dia.nombreDia}
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                                                                        {dia.items.map((item, idx) => (
                                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-main)', borderLeft: '2px solid var(--border-subtle)', paddingLeft: '0.75rem' }}>
                                                                                <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                                                                                    <span style={{ minWidth: '150px' }}>{item.nombre || item.tipo}</span>
                                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.tipo}</span>
                                                                                </div>
                                                                                <div style={{ fontWeight: 600 }}>${parseFloat(item.monto).toFixed(2)}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                        Subtotal día: <strong style={{ color: 'var(--text-main)', marginLeft: '0.5rem' }}>${dia.subtotal.toFixed(2)}</strong>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Acciones Globales */}
                                        {semanasPendientes.length > 1 && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                                <button 
                                                    className="btn btn-secondary"
                                                    onClick={pagarTodo}
                                                    disabled={payingAll || payingWeek !== null}
                                                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                                                >
                                                    {payingAll ? 'Procesando...' : `Liquidar Todo ($${comisionesData.totales.pendiente.toFixed(2)})`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* BLOQUE C — Historial de pagos (Informativo) */}
                            {historialPagos.length > 0 && (
                                <div style={{ 
                                    marginTop: '1rem', 
                                    paddingTop: '2rem', 
                                    borderTop: '1px solid var(--border-subtle)',
                                    opacity: 0.85
                                }}>
                                    <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', fontWeight: 600 }}>
                                        Historial de Pagos Realizados
                                    </h3>
                                    
                                    <div className="table-responsive" style={{ borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border-subtle)' }}>Fecha Pago</th>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border-subtle)' }}>Monto</th>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border-subtle)' }}>Operador</th>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border-subtle)' }}>Notas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historialPagos.map(p => (
                                                    <tr key={p.id}>
                                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                            {new Date(p.fecha_pago).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                                                                {new Date(p.fecha_pago).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--success)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                            ${p.monto.toFixed(2)}
                                                        </td>
                                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                            {p.pagado_por || 'Admin'}
                                                        </td>
                                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                            {p.notas || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
