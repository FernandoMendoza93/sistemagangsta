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

    if (loading && !selectedBarbero) {
        return (
            <div className="p-4 sm:p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-coral/10 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-coral" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 m-0">Horarios del Personal</h1>
                        <p className="text-gray-500 m-0">Cargando configuraciones...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 font-sans max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-coral/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-coral" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 m-0">Horarios del Personal</h1>
                    <p className="text-gray-500 text-sm sm:text-base m-0">Configura los días y horas laborales de cada barbero</p>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-800 mb-8 flex items-start gap-3 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
                <div className="text-sm">
                    <strong>Importante:</strong> Los horarios definidos aquí controlan qué días y a qué horas los clientes pueden agendar con este barbero en el Portal de Reservas. Si un día está apagado, no aparecerá en el calendario de turnos.
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
                
                {/* Panel Izquierdo: Lista de Barberos */}
                <div className="bg-white/85 border border-black/5 rounded-[20px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl">
                    <h3 className="m-0 mb-5 text-lg text-gray-900 font-extrabold flex items-center gap-2">
                        <User className="w-5 h-5" /> Selecciona un Barbero
                    </h3>
                    <div className="flex flex-col gap-3">
                        {barberos.map(b => {
                            const isActive = selectedBarbero?.id === b.id;
                            return (
                                <button
                                    key={b.id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 w-full text-left relative min-h-[44px] ${isActive ? 'bg-[#FFF5F2] border-2 border-coral shadow-[0_4px_15px_rgba(255,107,74,0.15)]' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                                    onClick={() => handleSelectBarbero(b)}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-lg text-white shadow-sm ${isActive ? 'bg-gradient-to-br from-coral to-[#FF5A2A]' : 'bg-gradient-to-br from-gray-800 to-gray-600'}`}>
                                        {b.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-bold text-sm sm:text-base ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{b.nombre}</span>
                                        {isActive && <span className="text-[0.7rem] text-coral font-bold mt-0.5 uppercase tracking-wider">Seleccionado</span>}
                                    </div>
                                    {isActive && <UserCheck className="w-5 h-5 absolute right-4 text-coral" />}
                                </button>
                            );
                        })}
                        {barberos.length === 0 && (
                            <p className="text-gray-500 text-sm text-center py-4">No hay barberos activos registrados.</p>
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Configuración de la semana */}
                <div className="bg-white/85 border border-black/5 rounded-[20px] p-4 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h3 className="m-0 text-lg sm:text-xl text-gray-900 font-extrabold flex items-center">
                            Jornada Semanal — <span className="text-coral ml-2">{selectedBarbero?.nombre}</span>
                        </h3>
                        {/* 44px Interaction Target */}
                        <button 
                            className={`flex items-center justify-center min-h-[44px] px-6 gap-2 rounded-xl border-none font-bold transition-all duration-300 w-full sm:w-auto shadow-sm ${hayCambiosSinGuardar ? 'bg-coral text-white hover:bg-[#e55a3b] hover:-translate-y-0.5 hover:shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            onClick={handleSaveBatch}
                            disabled={!hayCambiosSinGuardar || saving}
                        >
                            <Save className={`${saving ? 'animate-pulse' : ''} w-5 h-5`} />
                            {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
                        </button>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        {horarios.map(dia => {
                            const isActivo = dia.activo === 1;
                            return (
                                <div key={dia.dia_semana} className={`grid grid-cols-1 sm:grid-cols-[140px_1fr_10px] items-center gap-4 sm:gap-6 p-4 rounded-2xl transition-all duration-200 ${isActivo ? 'bg-white border hover:border-emerald-300 border-l-4 border-l-emerald-500 shadow-sm' : 'bg-gray-50 border border-gray-200 opacity-70'}`}>
                                    
                                    <div className="flex items-center gap-3">
                                        {/* Toggle Touch Target 44px */}
                                        <label className="relative inline-flex items-center cursor-pointer min-h-[44px]">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={isActivo}
                                                onChange={(e) => handleHorarioChange(dia.dia_semana, 'activo', e.target.checked ? 1 : 0)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                        <span className={`font-bold text-[0.95rem] ${isActivo ? 'text-gray-900' : 'text-gray-500'}`}>{DIAS_SEMANA[dia.dia_semana].nombre}</span>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3">
                                        {/* Mobile-friendly time inputs */}
                                        <input
                                            type="time"
                                            className={`w-full sm:w-[130px] text-center font-bold px-3 py-2 border rounded-xl min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-coral/50 ${isActivo ? 'bg-white border-gray-300 text-gray-900' : 'bg-transparent border-transparent text-gray-400'}`}
                                            value={dia.hora_inicio}
                                            onChange={(e) => handleHorarioChange(dia.dia_semana, 'hora_inicio', e.target.value)}
                                            disabled={!isActivo}
                                        />
                                        <span className="text-gray-400 text-sm font-semibold">a</span>
                                        <input
                                            type="time"
                                            className={`w-full sm:w-[130px] text-center font-bold px-3 py-2 border rounded-xl min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-coral/50 ${isActivo ? 'bg-white border-gray-300 text-gray-900' : 'bg-transparent border-transparent text-gray-400'}`}
                                            value={dia.hora_fin}
                                            onChange={(e) => handleHorarioChange(dia.dia_semana, 'hora_fin', e.target.value)}
                                            disabled={!isActivo}
                                        />
                                    </div>
                                    <div className="hidden sm:block"></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
