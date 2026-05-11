import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { superAdminService } from '../services/api';
import { HardDrive, Server, DollarSign, Power, Activity, Shield, Users, Store, Eye, MessageCircle, Calendar, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminPage() {
    const { token } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [barberias, setBarberias] = useState([]);
    const [alertas, setAlertas] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [barberiaARenovar, setBarberiaARenovar] = useState(null);
    const [mesesRenovacion, setMesesRenovacion] = useState(1);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [metricsRes, barbRes, alertasRes] = await Promise.all([
                superAdminService.getMetrics(),
                superAdminService.getBarberias(),
                superAdminService.verificarAlertas()
            ]);
            setMetrics(metricsRes.data);
            setBarberias(Array.isArray(barbRes.data) ? barbRes.data : []);
            setAlertas(alertasRes.data);
        } catch (err) {
            console.error('Error loading superadmin data:', err);
            toast.error('Error al cargar datos del servidor');
        } finally {
            setLoading(false);
        }
    }

    async function toggleBarberia(id, estadoActual) {
        try {
            const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
            await superAdminService.updateEstadoBarberia(id, nuevoEstado);
            setBarberias(prev => prev.map(b => b.id === id ? { ...b, estado: nuevoEstado } : b));
            const metricsRes = await superAdminService.getMetrics();
            setMetrics(metricsRes.data);
            toast.success(`Estado de la barbería actualizado a ${nuevoEstado}`);
        } catch (err) {
            console.error('Error toggling barberia:', err);
            toast.error('No se pudo actualizar el estado');
        }
    }

    const handleRecordatorio = (barberia) => {
        const diasRestantes = Math.ceil(
            (new Date(barberia.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        const clabe = "014610140268173701";
        const banco = "Santander";
        const titular = "Angel Fernando Mendoza Martinez";

        const mensaje = diasRestantes < 0
            ? `Hola! Te contacto de FlowSystem. Tu suscripción de ${barberia.nombre} ha vencido. Para reactivar tu acceso realiza tu pago a la CLABE: ${clabe}. Banco ${banco}, titular ${titular}.`
            : `Hola! Te contacto de FlowSystem. Tu suscripción de ${barberia.nombre} vence en ${diasRestantes} días (${new Date(barberia.fecha_vencimiento).toLocaleDateString('es-MX')}). Para renovar realiza tu transferencia a la CLABE: ${clabe}. Banco ${banco}, titular ${titular}.`;

        window.open(
            `https://wa.me/${barberia.telefono_whatsapp || barberia.telefono}?text=${encodeURIComponent(mensaje)}`,
            '_blank'
        );
    };

    const openRenewModal = (barberia) => {
        setBarberiaARenovar(barberia);
        setMesesRenovacion(1);
        setShowRenewModal(true);
    };

    const handleRenovar = async () => {
        try {
            setSaving(true);
            await superAdminService.renovarBarberia(barberiaARenovar.id, mesesRenovacion);
            toast.success('Suscripción renovada exitosamente');
            setShowRenewModal(false);
            loadData(); // Recargar todo para ver reflejada la nueva fecha
        } catch (error) {
            console.error('Error renovando barbería:', error);
            toast.error('Error al renovar la suscripción');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 lg:p-10 max-w-[1300px] mx-auto font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-10 gap-2 sm:gap-0">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-gray-900 m-0 flex items-center gap-3 tracking-tight">
                        <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-coral" /> Puente de Mando
                    </h1>
                    <p className="text-gray-500 text-sm sm:text-base font-medium mt-1">Monitoreo de Infraestructura y Negocios SaaS</p>
                </div>
                {/* Botón de Extracción JSON UTF-8 para la Migración MySQL */}
                <button
                    onClick={() => {
                        const baseUrl = import.meta.env.VITE_API_URL || '';
                        window.location.href = `${baseUrl}/api/superadmin/database/backup?token=${token}`;
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-0.5"
                >
                    <HardDrive className="w-5 h-5 text-coral" />
                    Extraer Backup SQLite
                </button>
            </div>

            {/* KPIs Bento */}
            {metrics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
                    <div className="bg-white/70 border border-white/50 rounded-3xl p-6 flex flex-col justify-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 bg-coral/10">
                            <Server className="w-6 h-6 text-coral" />
                        </div>
                        <div>
                            <p className="font-display text-2xl sm:text-3xl font-extrabold text-gray-900 m-0 leading-tight tracking-tight">{metrics.ramUsed}</p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-semibold uppercase tracking-wide">Node RAM Usage</p>
                        </div>
                    </div>
                    <div className="bg-white/70 border border-white/50 rounded-3xl p-6 flex flex-col justify-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 bg-blue-500/10">
                            <HardDrive className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="font-display text-2xl sm:text-3xl font-extrabold text-gray-900 m-0 leading-tight tracking-tight">{metrics.dbSize}</p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-semibold uppercase tracking-wide">SQLite File Size</p>
                        </div>
                    </div>
                    <div className="bg-white/70 border border-white/50 rounded-3xl p-6 flex flex-col justify-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 bg-emerald-500/10">
                            <Activity className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="font-display text-2xl sm:text-3xl font-extrabold text-gray-900 m-0 leading-tight tracking-tight">{metrics.barberiasActivas}</p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-semibold uppercase tracking-wide">Tenants Activas</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-[#FF6B4A] to-[#FF8F75] border border-[#FF6B4A]/40 shadow-[0_15px_35px_rgba(255,107,74,0.3)] rounded-3xl p-6 flex flex-col justify-center gap-4 backdrop-blur-xl">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 bg-white/20">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="font-display text-2xl sm:text-3xl font-extrabold text-white m-0 leading-tight tracking-tight">
                                ${metrics.mrr?.toLocaleString()} <small className="text-base font-semibold opacity-80">MXN</small>
                            </p>
                            <p className="text-xs sm:text-sm text-white/90 mt-1 font-semibold uppercase tracking-wide">Monthly Recurring Revenue (MRR)</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Section: Alertas del Sistema */}
            {alertas && (alertas.vencidas.length > 0 || alertas.proximas_a_vencer.length > 0) && (
                <div className="bg-white/70 border border-red-200 rounded-3xl p-6 mb-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                    <h2 className="font-display text-lg font-bold text-red-600 m-0 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-500" /> ALERTAS DEL SISTEMA
                    </h2>
                    <div className="mt-4 space-y-3">
                        {alertas.vencidas.map(b => (
                            <div key={b.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-red-50/50 p-4 rounded-xl gap-2 sm:gap-0">
                                <span className="text-red-700 text-sm font-medium flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                                    Suscripción vencida: <strong>{b.nombre}</strong>
                                </span>
                                <button 
                                    onClick={() => handleRecordatorio(b)}
                                    className="flex items-center gap-1.5 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-bold transition-colors"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" /> Enviar Recordatorio
                                </button>
                            </div>
                        ))}
                        {alertas.proximas_a_vencer.map(b => {
                            const dias = Math.ceil((new Date(b.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={b.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-orange-50/50 p-4 rounded-xl gap-2 sm:gap-0">
                                    <span className="text-orange-700 text-sm font-medium flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
                                        Próxima a vencer en {dias} días: <strong>{b.nombre}</strong>
                                    </span>
                                    <button 
                                        onClick={() => handleRecordatorio(b)}
                                        className="flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-bold transition-colors"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" /> Enviar Recordatorio
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Barberias Table Section */}
            <div className="bg-white/85 border border-white/60 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden backdrop-blur-xl">
                <div className="p-6 sm:p-8 border-b border-black/5">
                    <h2 className="font-display text-lg sm:text-xl font-bold text-gray-900 m-0 flex items-center">
                        <Store className="w-5 h-5 mr-2" /> Listado Global de Barberías
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse whitespace-nowrap">
                        <thead>
                            <tr>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"># ID</th>
                                <th className="bg-gray-50/50 p-4 sm:px-4 sm:py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ width: '60px' }}>Logo</th>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre / Dominio</th>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plan / Vencimiento</th>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Personal</th>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(barberias) && barberias.map(barb => {
                                const diasRestantes = Math.ceil((new Date(barb.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
                                
                                return (
                                    <tr key={barb.id} className={`transition-colors hover:bg-gray-50/80 ${barb.estado === 'Inactivo' ? 'opacity-60 bg-gray-50/40' : ''}`}>
                                        <td className="p-4 sm:px-8 sm:py-5 border-b border-black/5 font-mono font-bold text-gray-400">
                                            #{barb.id.toString().padStart(3, '0')}
                                        </td>
                                        <td className="p-4 sm:px-4 sm:py-5 border-b border-black/5 text-center align-middle">
                                            <div className="flex justify-center">
                                                {barb.logo_url ? (
                                                    <img 
                                                        src={barb.logo_url} 
                                                        alt={`Logo ${barb.nombre}`} 
                                                        className="w-10 h-10 rounded-full object-cover shadow-sm bg-gray-50"
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                    />
                                                ) : null}
                                                <div 
                                                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200"
                                                    style={{ display: barb.logo_url ? 'none' : 'flex' }}
                                                >
                                                    <Store className="w-5 h-5 text-gray-400" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 sm:px-8 sm:py-5 border-b border-black/5">
                                            <div className="font-bold text-gray-900 text-base">{barb.nombre}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">/{barb.slug}</div>
                                        </td>
                                        <td className="p-4 sm:px-8 sm:py-5 border-b border-black/5">
                                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide inline-flex items-center ${barb.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {barb.estado}
                                            </span>
                                        </td>
                                        <td className="p-4 sm:px-8 sm:py-5 border-b border-black/5">
                                            <div className="font-semibold text-gray-700 capitalize flex flex-col gap-1">
                                                <span>{barb.plan} <span className="text-gray-400 text-xs sm:text-sm ml-2">${barb.precio_plan}</span></span>
                                                {/* Badge de Vencimiento */}
                                                {diasRestantes < 0 ? (
                                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold w-max">VENCIDA</span>
                                                ) : diasRestantes <= 7 ? (
                                                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold w-max">Vence en {diasRestantes} días</span>
                                                ) : (
                                                    <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold w-max">Al corriente</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 sm:px-8 sm:py-5 border-b border-black/5">
                                            <div className="flex items-center gap-1.5 font-semibold text-gray-600">
                                                <Users className="w-4 h-4" /> {barb.totalUsuarios}
                                            </div>
                                        </td>
                                        <td className="p-4 sm:px-8 sm:py-5 border-b border-black/5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Previsualizar Portal del Cliente */}
                                                {barb.estado === 'Activo' && barb.slug && (
                                                    <button
                                                        className="inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors duration-200 bg-blue-500/10 text-blue-500 hover:bg-blue-500/15"
                                                        onClick={() => window.open(`/portal/${barb.slug}`, '_blank')}
                                                        title={`Abrir portal de ${barb.nombre}`}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1.5" />
                                                        Portal
                                                    </button>
                                                )}
                                                {/* Botón WhatsApp */}
                                                <button
                                                    className="inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors duration-200 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15"
                                                    onClick={() => handleRecordatorio(barb)}
                                                    title={`Enviar WhatsApp a ${barb.nombre}`}
                                                >
                                                    <MessageCircle className="w-4 h-4 mr-1.5" />
                                                    Mensaje
                                                </button>
                                                {/* Botón Renovar */}
                                                <button
                                                    className="inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors duration-200 bg-purple-500/10 text-purple-500 hover:bg-purple-500/15"
                                                    onClick={() => openRenewModal(barb)}
                                                    title={`Renovar suscripción de ${barb.nombre}`}
                                                >
                                                    <Calendar className="w-4 h-4 mr-1.5" />
                                                    Renovar
                                                </button>
                                                {/* Toggle Estado */}
                                                <button
                                                    className={`inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors duration-200 ${barb.estado === 'Activo' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/15' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15'}`}
                                                    onClick={() => toggleBarberia(barb.id, barb.estado)}
                                                >
                                                    <Power className="w-4 h-4 mr-1.5" />
                                                    {barb.estado === 'Activo' ? 'Revocar' : 'Restaurar'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {(!Array.isArray(barberias) || barberias.length === 0) && (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-500">No hay barberías registradas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Renovación */}
            {showRenewModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-display text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-coral" /> Renovar Suscripción
                            </h3>
                            <button onClick={() => setShowRenewModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4">
                            Estas renovando la suscripción para <strong>{barberiaARenovar?.nombre}</strong>.
                        </p>
                        
                        <div className="form-group mb-6">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Paquete de Renovación</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    className={`p-4 rounded-xl border-2 font-bold text-sm transition-colors ${mesesRenovacion === 1 ? 'border-coral bg-coral/5 text-coral' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                    onClick={() => setMesesRenovacion(1)}
                                >
                                    +1 Mes
                                </button>
                                <button
                                    type="button"
                                    className={`p-4 rounded-xl border-2 font-bold text-sm transition-colors ${mesesRenovacion === 12 ? 'border-coral bg-coral/5 text-coral' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                    onClick={() => setMesesRenovacion(12)}
                                >
                                    +12 Meses (Anual)
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRenewModal(false)}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRenovar}
                                className="flex items-center gap-2 px-5 py-2.5 bg-coral hover:bg-coral/90 text-white rounded-xl font-bold shadow-lg transition-colors disabled:opacity-50"
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : <><CheckCircle className="w-5 h-5" /> Confirmar Renovación</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
