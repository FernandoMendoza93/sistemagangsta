import React, { useState, useEffect } from 'react';
import { Clock, Save, User, UserCheck, AlertCircle } from 'lucide-react';
import { horariosService, citasService } from '../services/api';
import toast from 'react-hot-toast';

const DIAS_SEMANA = [
    { num: 0, nombre: 'Domingo' },
    { num: 1, nombre: 'Lunes' },
    { num: 2, nombre: 'Martes' },
    { num: 3, nombre: 'Miércoles' },
    { num: 4, nombre: 'Jueves' },
    { num: 5, nombre: 'Viernes' },
    { num: 6, nombre: 'Sábado' }
];

export default function HorariosPage() {
    const [barberos, setBarberos] = useState([]);
    const [selectedBarbero, setSelectedBarbero] = useState(null);
    const [horarios, setHorarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadBarberos();
    }, []);

    async function loadBarberos() {
        try {
            const res = await citasService.getBarberos();
            setBarberos(res.data || []);
            if (res.data?.length > 0) {
                handleSelectBarbero(res.data[0]);
            }
        } catch (error) {
            console.error('Error cargando barberos:', error);
            toast.error('Error al cargar la lista de barberos');
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectBarbero(barbero) {
        setSelectedBarbero(barbero);
        setLoading(true);
        try {
            const res = await horariosService.getByBarbero(barbero.id);
            const horasDB = res.data.horarios || [];

            const horasFormateadas = DIAS_SEMANA.map(dia => {
                const existe = horasDB.find(h => h.dia_semana === dia.num);
                if (existe) {
                    return { ...existe, modificado: false };
                }
                return {
                    dia_semana: dia.num,
                    hora_inicio: '10:00',
                    hora_fin: '20:00',
                    activo: 0,
                    modificado: false
                };
            });
            setHorarios(horasFormateadas);
        } catch (error) {
            console.error('Error cargando horarios del barbero:', error);
            toast.error('Error al cargar horarios');
        } finally {
            setLoading(false);
        }
    }

    function handleHorarioChange(diaNum, field, value) {
        setHorarios(prev => prev.map(h => {
            if (h.dia_semana === diaNum) {
                return { ...h, [field]: value, modificado: true };
            }
            return h;
        }));
    }

    async function handleSaveBatch() {
        const cambiosInvalidos = horarios.find(h => h.activo === 1 && (!h.hora_inicio || !h.hora_fin || h.hora_inicio >= h.hora_fin));
        if (cambiosInvalidos) {
            return toast.error(`Error en ${DIAS_SEMANA[cambiosInvalidos.dia_semana].nombre}: Hora inicio debe ser menor a hora fin y no estar vacías`);
        }

        setSaving(true);
        try {
            await horariosService.updateBatch(selectedBarbero.id, horarios.map(h => ({
                dia_semana: h.dia_semana,
                hora_inicio: h.hora_inicio,
                hora_fin: h.hora_fin,
                activo: h.activo
            })));

            toast.success(`¡Jornada semanal de ${selectedBarbero.nombre} actualizada con éxito!`, { duration: 4000 });
            setHorarios(prev => prev.map(h => ({ ...h, modificado: false })));
        } catch (error) {
            console.error('Error guardando en lote:', error);
            toast.error(error.response?.data?.error || 'Error al guardar la semana');
        } finally {
            setSaving(false);
        }
    }

    const hayCambiosSinGuardar = horarios.some(h => h.modificado);

    const panelStyle = {
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '1.5rem',
        boxShadow: '0 4px 20px var(--shadow-color)'
    };

    if (loading && !selectedBarbero) {
        return (
            <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(var(--accent-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock style={{ width: '24px', height: '24px', color: 'var(--accent-primary)' }} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>Horarios del Personal</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Cargando configuraciones...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(var(--accent-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock style={{ width: '24px', height: '24px', color: 'var(--accent-primary)' }} />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>Horarios del Personal</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configura los días y horas laborales de cada barbero</p>
                </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--text-main)', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', borderRadius: '16px' }}>
                <AlertCircle style={{ width: '20px', height: '20px', marginTop: '2px', color: 'var(--info, #3B82F6)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.875rem' }}>
                    <strong>Importante:</strong> Los horarios definidos aquí controlan qué días y a qué horas los clientes pueden agendar con este barbero en el Portal de Reservas. Si un día está apagado, no aparecerá en el calendario de turnos.
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* Panel Izquierdo: Lista de Barberos */}
                <div style={panelStyle}>
                    <h3 style={{ margin: 0, marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User style={{ width: '20px', height: '20px' }} /> Selecciona un Barbero
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {barberos.map(b => {
                            const isActive = selectedBarbero?.id === b.id;
                            return (
                                <button
                                    key={b.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1rem',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        width: '100%',
                                        textAlign: 'left',
                                        position: 'relative',
                                        minHeight: '44px',
                                        background: isActive ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'var(--bg-input)',
                                        border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                        boxShadow: isActive ? '0 4px 15px rgba(var(--accent-primary-rgb), 0.15)' : 'none'
                                    }}
                                    onClick={() => handleSelectBarbero(b)}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: '1.1rem',
                                        color: '#fff',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        background: isActive ? 'var(--accent-primary)' : 'var(--text-muted)'
                                    }}>
                                        {b.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{b.nombre}</span>
                                        {isActive && <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seleccionado</span>}
                                    </div>
                                    {isActive && <UserCheck style={{ width: '20px', height: '20px', position: 'absolute', right: '16px', color: 'var(--accent-primary)' }} />}
                                </button>
                            );
                        })}
                        {barberos.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>No hay barberos activos registrados.</p>
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Configuración de la semana */}
                <div style={panelStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                            Jornada Semanal — <span style={{ color: 'var(--accent-primary)', marginLeft: '0.5rem' }}>{selectedBarbero?.nombre}</span>
                        </h3>
                        <button
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '44px',
                                padding: '0 1.5rem',
                                gap: '0.5rem',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: 700,
                                transition: 'all 0.3s',
                                boxShadow: hayCambiosSinGuardar ? '0 2px 8px rgba(var(--accent-primary-rgb), 0.2)' : 'none',
                                background: hayCambiosSinGuardar ? 'var(--accent-primary)' : 'var(--bg-input)',
                                color: hayCambiosSinGuardar ? '#fff' : 'var(--text-muted)',
                                cursor: hayCambiosSinGuardar ? 'pointer' : 'not-allowed'
                            }}
                            onClick={handleSaveBatch}
                            disabled={!hayCambiosSinGuardar || saving}
                        >
                            <Save style={{ width: '20px', height: '20px' }} />
                            {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {horarios.map(dia => {
                            const isActivo = dia.activo === 1;
                            return (
                                <div key={dia.dia_semana} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '140px 1fr',
                                    alignItems: 'center',
                                    gap: '1.5rem',
                                    padding: '1rem',
                                    borderRadius: '16px',
                                    transition: 'all 0.2s',
                                    background: isActivo ? 'var(--bg-surface)' : 'var(--bg-input)',
                                    border: isActivo ? '1px solid var(--border-color)' : '1px solid var(--border-subtle)',
                                    borderLeft: isActivo ? '4px solid #10B981' : '4px solid transparent',
                                    opacity: isActivo ? 1 : 0.7,
                                    boxShadow: isActivo ? '0 2px 8px var(--shadow-color)' : 'none'
                                }}>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', minHeight: '44px' }}>
                                            <input
                                                type="checkbox"
                                                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                                checked={isActivo}
                                                onChange={(e) => handleHorarioChange(dia.dia_semana, 'activo', e.target.checked ? 1 : 0)}
                                            />
                                            <div style={{
                                                width: '44px',
                                                height: '24px',
                                                borderRadius: '12px',
                                                background: isActivo ? '#10B981' : 'var(--bg-hover)',
                                                border: `1px solid ${isActivo ? '#10B981' : 'var(--border-color)'}`,
                                                position: 'relative',
                                                transition: 'all 0.3s',
                                                cursor: 'pointer'
                                            }}>
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: '#fff',
                                                    position: 'absolute',
                                                    top: '1px',
                                                    left: isActivo ? '22px' : '1px',
                                                    transition: 'left 0.3s',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                }} />
                                            </div>
                                        </label>
                                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isActivo ? 'var(--text-main)' : 'var(--text-muted)' }}>{DIAS_SEMANA[dia.dia_semana].nombre}</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <input
                                            type="time"
                                            style={{
                                                width: '130px',
                                                textAlign: 'center',
                                                fontWeight: 700,
                                                padding: '0.5rem 0.75rem',
                                                border: isActivo ? '1px solid var(--border-color)' : '1px solid transparent',
                                                borderRadius: '12px',
                                                minHeight: '44px',
                                                transition: 'all 0.2s',
                                                background: isActivo ? 'var(--bg-surface)' : 'transparent',
                                                color: isActivo ? 'var(--text-main)' : 'var(--text-muted)',
                                                outline: 'none'
                                            }}
                                            value={dia.hora_inicio}
                                            onChange={(e) => handleHorarioChange(dia.dia_semana, 'hora_inicio', e.target.value)}
                                            disabled={!isActivo}
                                        />
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>a</span>
                                        <input
                                            type="time"
                                            style={{
                                                width: '130px',
                                                textAlign: 'center',
                                                fontWeight: 700,
                                                padding: '0.5rem 0.75rem',
                                                border: isActivo ? '1px solid var(--border-color)' : '1px solid transparent',
                                                borderRadius: '12px',
                                                minHeight: '44px',
                                                transition: 'all 0.2s',
                                                background: isActivo ? 'var(--bg-surface)' : 'transparent',
                                                color: isActivo ? 'var(--text-main)' : 'var(--text-muted)',
                                                outline: 'none'
                                            }}
                                            value={dia.hora_fin}
                                            onChange={(e) => handleHorarioChange(dia.dia_semana, 'hora_fin', e.target.value)}
                                            disabled={!isActivo}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
