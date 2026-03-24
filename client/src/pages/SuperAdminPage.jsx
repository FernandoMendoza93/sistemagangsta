import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { superAdminService } from '../services/api';
import { HardDrive, Server, DollarSign, Power, Activity, Shield, Users, Store } from 'lucide-react';

export default function SuperAdminPage() {
    const { token } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [barberias, setBarberias] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [metricsRes, barbRes] = await Promise.all([
                superAdminService.getMetrics(),
                superAdminService.getBarberias()
            ]);
            setMetrics(metricsRes.data);
            setBarberias(Array.isArray(barbRes.data) ? barbRes.data : []);
        } catch (err) {
            console.error('Error loading superadmin data:', err);
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
        } catch (err) {
            console.error('Error toggling barberia:', err);
        }
    }

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
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre / Dominio</th>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plan Suscripción</th>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Personal</th>
                                <th className="bg-gray-50/50 p-4 sm:px-8 sm:py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acceso / Motor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(barberias) && barberias.map(barb => (
                                <tr key={barb.id} className={`transition-colors hover:bg-gray-50/80 ${barb.estado === 'Inactivo' ? 'opacity-60 bg-gray-50/40' : ''}`}>
                                    <td className="p-4 sm:px-8 sm:py-5 border-b border-black/5 font-mono font-bold text-gray-400">
                                        #{barb.id.toString().padStart(3, '0')}
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
                                        <div className="font-semibold text-gray-700 capitalize">
                                            {barb.plan} <span className="text-gray-400 text-xs sm:text-sm ml-2">${barb.precio_plan}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 sm:px-8 sm:py-5 border-b border-black/5">
                                        <div className="flex items-center gap-1.5 font-semibold text-gray-600">
                                            <Users className="w-4 h-4" /> {barb.totalUsuarios}
                                        </div>
                                    </td>
                                    <td className="p-4 sm:px-8 sm:py-5 border-b border-black/5 text-right">
                                        {/* TACTILE 44px rule applied here using min-h-[44px] min-w-[44px] */}
                                        <button
                                            className={`inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors duration-200 ${barb.estado === 'Activo' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/15' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15'}`}
                                            onClick={() => toggleBarberia(barb.id, barb.estado)}
                                        >
                                            <Power className="w-4 h-4 mr-1.5" />
                                            {barb.estado === 'Activo' ? 'Revocar Acceso' : 'Restaurar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {(!Array.isArray(barberias) || barberias.length === 0) && (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">No hay barberías registradas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
