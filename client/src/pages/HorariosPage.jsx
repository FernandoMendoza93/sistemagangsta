import React, { useState, useEffect } from 'react';
import { Clock, Save, User, UserCheck, AlertCircle } from 'lucide-react';
import { horariosService, citasService } from '../services/api';
import toast from 'react-hot-toast';
import './HorariosPage.css';

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
            // Mappear los horarios del server (o crear defaults si no existen)
            const horasDB = res.data.horarios || [];
            
            const horasFormateadas = DIAS_SEMANA.map(dia => {
                const existe = horasDB.find(h => h.dia_semana === dia.num);
                if (existe) {
                    return { ...existe, modificado: false };
                }
                // Default si no hay registro
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
            // Mandar todos los horarios del barbero actual para sobreescribir la semana
            await horariosService.updateBatch(selectedBarbero.id, horarios.map(h => ({
                dia_semana: h.dia_semana,
                hora_inicio: h.hora_inicio,
                hora_fin: h.hora_fin,
                activo: h.activo
            })));
            
            toast.success(`¡Jornada semanal de ${selectedBarbero.nombre} actualizada con éxito!`, { duration: 4000 });
            
            // Limpiar flag de modificados locales
            setHorarios(prev => prev.map(h => ({ ...h, modificado: false })));
        } catch (error) {
            console.error('Error guardando en lote:', error);
            toast.error(error.response?.data?.error || 'Error al guardar la semana');
        } finally {
            setSaving(false);
        }
    }

    const hayCambiosSinGuardar = horarios.some(h => h.modificado);

    if (loading && !selectedBarbero) {
        return (
            <div className="layout-content">
                <div className="page-header">
                    <div className="header-icon primary"><Clock size={24} /></div>
                    <div className="header-info">
                        <h1>Horarios del Personal</h1>
                        <p>Cargando configuraciones...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="layout-content">
            <div className="page-header">
                <div className="header-icon primary"><Clock size={24} /></div>
                <div className="header-info">
                    <h1>Horarios del Personal</h1>
                    <p>Configura los días y horas laborales de cada barbero</p>
                </div>
            </div>

            <div className="alert bg-blue-50 border-blue-200 text-blue-800 mb-6 flex items-start gap-3 p-4 rounded-xl">
                <AlertCircle size={20} className="mt-0.5 text-blue-600 flex-shrink-0" />
                <div className="text-sm">
                    <strong>Importante:</strong> Los horarios definidos aquí controlan qué días y a qué horas los clientes pueden agendar con este barbero en el Portal de Reservas. Si un día está apagado, no aparecerá en el calendario de turnos.
                </div>
            </div>

            <div className="horarios-grid">
                {/* Panel Izquierdo: Lista de Barberos */}
                <div className="barberos-panel bento-card">
                    <h3><User size={18} /> Selecciona un Barbero</h3>
                    <div className="barbero-list">
                        {barberos.map(b => (
                            <button
                                key={b.id}
                                className={`btn-barbero ${selectedBarbero?.id === b.id ? 'active' : ''}`}
                                onClick={() => handleSelectBarbero(b)}
                            >
                                <div className="barb-avatar">
                                    {b.nombre.charAt(0).toUpperCase()}
                                </div>
                                <div className="barb-info">
                                    <span className="b-nombre">{b.nombre}</span>
                                    {selectedBarbero?.id === b.id && <span className="b-badge">Seleccionado</span>}
                                </div>
                                {selectedBarbero?.id === b.id && <UserCheck size={18} className="icon-check" />}
                            </button>
                        ))}
                        {barberos.length === 0 && (
                            <p className="no-data">No hay barberos activos registrados.</p>
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Configuración de la semana */}
                <div className="dias-panel bento-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Jornada Semanal — {selectedBarbero?.nombre}</h3>
                        <button 
                            className={`btn-save-batch ${hayCambiosSinGuardar ? 'pulsing' : ''}`}
                            onClick={handleSaveBatch}
                            disabled={!hayCambiosSinGuardar || saving}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 16px', borderRadius: '8px', border: 'none',
                                background: hayCambiosSinGuardar ? 'var(--primary)' : 'var(--bg-glass-strong)',
                                color: hayCambiosSinGuardar ? '#fff' : 'var(--text-muted)',
                                fontWeight: 600, cursor: hayCambiosSinGuardar && !saving ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s'
                            }}
                        >
                            <Save size={18} />
                            {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
                        </button>
                    </div>
                    <div className="semana-list">
                        {horarios.map(dia => (
                            <div key={dia.dia_semana} className={`dia-row ${dia.activo ? 'activo' : 'inactivo'}`}>
                                <div className="dia-col-toggle">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={dia.activo === 1}
                                            onChange={(e) => handleHorarioChange(dia.dia_semana, 'activo', e.target.checked ? 1 : 0)}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                    <span className="dia-name">{DIAS_SEMANA[dia.dia_semana].nombre}</span>
                                </div>

                                <div className="dia-col-horas">
                                    <input
                                        type="time"
                                        className="form-control time-input"
                                        value={dia.hora_inicio}
                                        onChange={(e) => handleHorarioChange(dia.dia_semana, 'hora_inicio', e.target.value)}
                                        disabled={!dia.activo}
                                    />
                                    <span className="time-sep">a</span>
                                    <input
                                        type="time"
                                        className="form-control time-input"
                                        value={dia.hora_fin}
                                        onChange={(e) => handleHorarioChange(dia.dia_semana, 'hora_fin', e.target.value)}
                                        disabled={!dia.activo}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
