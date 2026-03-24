import React, { useState, useEffect } from 'react';
import { Clock, Save, User, UserCheck, AlertCircle } from 'lucide-react';
import { horariosService, citasService } from '../services/api';
import { toast } from 'sonner';
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

            toast.success(`Jornada semanal de ${selectedBarbero.nombre} actualizada con éxito`, { duration: 4000 });
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
            <div className="horarios-page">
                <div className="horarios-header">
                    <div className="horarios-header-icon">
                        <Clock style={{ width: '24px', height: '24px', color: 'var(--accent-primary)' }} />
                    </div>
                    <div>
                        <h1>Horarios del Personal</h1>
                        <p>Cargando configuraciones...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="horarios-page">
            <div className="horarios-header">
                <div className="horarios-header-icon">
                    <Clock style={{ width: '24px', height: '24px', color: 'var(--accent-primary)' }} />
                </div>
                <div>
                    <h1>Horarios del Personal</h1>
                    <p>Configura los días y horas laborales de cada barbero</p>
                </div>
            </div>

            <div className="horarios-info-banner">
                <AlertCircle style={{ width: '20px', height: '20px', color: 'var(--info, #3B82F6)' }} />
                <div>
                    <strong>Importante:</strong> Los horarios definidos aquí controlan qué días y a qué horas los clientes pueden agendar con este barbero en el Portal de Reservas. Si un día está apagado, no aparecerá en el calendario de turnos.
                </div>
            </div>

            <div className="horarios-layout">
                {/* Panel Izquierdo: Lista de Barberos */}
                <div className="horarios-panel">
                    <h3 className="horarios-barberos-title">
                        <User style={{ width: '20px', height: '20px' }} /> Selecciona un Barbero
                    </h3>
                    <div className="horarios-barberos-list">
                        {barberos.map(b => {
                            const isActive = selectedBarbero?.id === b.id;
                            return (
                                <button
                                    key={b.id}
                                    className={`horarios-barbero-btn ${isActive ? 'active' : ''}`}
                                    onClick={() => handleSelectBarbero(b)}
                                >
                                    <div className="horarios-barbero-avatar">
                                        {b.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span className="horarios-barbero-name">{b.nombre}</span>
                                        {isActive && <span className="horarios-barbero-label">Seleccionado</span>}
                                    </div>
                                    {isActive && <UserCheck size={20} className="horarios-barbero-check" />}
                                </button>
                            );
                        })}
                        {barberos.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>No hay barberos activos registrados.</p>
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Configuración de la semana */}
                <div className="horarios-panel">
                    <div className="horarios-schedule-header">
                        <h3 className="horarios-schedule-title">
                            Jornada Semanal — <span>{selectedBarbero?.nombre}</span>
                        </h3>
                        <button
                            className={`horarios-save-btn ${hayCambiosSinGuardar ? 'has-changes' : ''}`}
                            onClick={handleSaveBatch}
                            disabled={!hayCambiosSinGuardar || saving}
                        >
                            <Save style={{ width: '20px', height: '20px' }} />
                            {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
                        </button>
                    </div>

                    <div className="horarios-days-list">
                        {horarios.map(dia => {
                            const isActivo = dia.activo === 1;
                            return (
                                <div key={dia.dia_semana} className={`horarios-day-row ${isActivo ? 'activo' : ''}`}>
                                    <div className="horarios-day-toggle">
                                        <label className="horarios-toggle-label">
                                            <input
                                                type="checkbox"
                                                checked={isActivo}
                                                onChange={(e) => handleHorarioChange(dia.dia_semana, 'activo', e.target.checked ? 1 : 0)}
                                            />
                                            <div className={`horarios-toggle-track ${isActivo ? 'on' : ''}`}>
                                                <div className="horarios-toggle-thumb" />
                                            </div>
                                        </label>
                                        <span className="horarios-day-name">{DIAS_SEMANA[dia.dia_semana].nombre}</span>
                                    </div>

                                    <div className="horarios-time-inputs">
                                        <input
                                            type="time"
                                            className="horarios-time-input"
                                            value={dia.hora_inicio}
                                            onChange={(e) => handleHorarioChange(dia.dia_semana, 'hora_inicio', e.target.value)}
                                            disabled={!isActivo}
                                        />
                                        <span>a</span>
                                        <input
                                            type="time"
                                            className="horarios-time-input"
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
