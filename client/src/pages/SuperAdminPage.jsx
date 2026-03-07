import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Scissors, Store, Users, CalendarDays, DollarSign, MessageCircle, Power, Shield } from 'lucide-react';
import './SuperAdminPage.css';

const API_BASE = '/api/superadmin';

export default function SuperAdminPage() {
    const { token } = useAuth();
    const [stats, setStats] = useState(null);
    const [barberias, setBarberias] = useState([]);
    const [loading, setLoading] = useState(true);

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [statsRes, barbRes] = await Promise.all([
                fetch(`${API_BASE}/stats`, { headers }),
                fetch(`${API_BASE}/barberias`, { headers })
            ]);
            setStats(await statsRes.json());
            setBarberias(await barbRes.json());
        } catch (err) {
            console.error('Error loading superadmin data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function toggleBarberia(id) {
        try {
            const res = await fetch(`${API_BASE}/barberias/${id}/toggle`, { method: 'PATCH', headers });
            const data = await res.json();
            if (res.ok) {
                setBarberias(prev => prev.map(b => b.id === id ? { ...b, activo: data.activo } : b));
            }
        } catch (err) {
            console.error('Error toggling barberia:', err);
        }
    }

    function buildWhatsAppLink(barb) {
        const venc = barb.fecha_vencimiento ? new Date(barb.fecha_vencimiento).toLocaleDateString('es-MX') : 'N/A';
        const plan = barb.plan === 'anual' ? 'Anual ($2,999)' : 'Mensual ($299)';
        const msg = encodeURIComponent(
            `Hola! Te contacto de Flow. Tu suscripcion del plan ${plan} para "${barb.nombre}" vence el ${venc}. Para renovar, realiza tu pago y confirma aqui. Gracias!`
        );
        const phone = barb.telefono_whatsapp || barb.email_contacto;
        return `https://wa.me/${phone}?text=${msg}`;
    }

    if (loading) {
        return <div className="sa-loading"><div className="cliente-spinner"></div></div>;
    }

    return (
        <div className="superadmin-page">
            {/* Header */}
            <div className="sa-header">
                <h1><Shield size={24} color="#FF6B4A" /> Master Control</h1>
                <p>Panel exclusivo de administracion de Flow</p>
            </div>

            {/* KPIs */}
            {stats && (
                <div className="sa-kpis">
                    <div className="sa-kpi-card">
                        <div className="kpi-icon orange"><Store size={22} color="#FF6B4A" /></div>
                        <div>
                            <p className="kpi-value">{stats.barberias_activas}</p>
                            <p className="kpi-label">Barberias Activas</p>
                        </div>
                    </div>
                    <div className="sa-kpi-card">
                        <div className="kpi-icon green"><DollarSign size={22} color="#34D399" /></div>
                        <div>
                            <p className="kpi-value">${stats.ingresos_suscripciones?.toLocaleString()}</p>
                            <p className="kpi-label">Ingresos Suscripciones</p>
                        </div>
                    </div>
                    <div className="sa-kpi-card">
                        <div className="kpi-icon blue"><Users size={22} color="#60A5FA" /></div>
                        <div>
                            <p className="kpi-value">{stats.clientes_total}</p>
                            <p className="kpi-label">Clientes Totales</p>
                        </div>
                    </div>
                    <div className="sa-kpi-card">
                        <div className="kpi-icon purple"><CalendarDays size={22} color="#A78BFA" /></div>
                        <div>
                            <p className="kpi-value">{stats.citas_total}</p>
                            <p className="kpi-label">Citas Procesadas</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Barberias Grid */}
            <div className="sa-barberias-grid">
                {barberias.map(barb => (
                    <div key={barb.id} className="barb-card">
                        <div className="barb-card-header">
                            <div>
                                <h3 className="barb-name">{barb.nombre}</h3>
                                <p className="barb-slug">/{barb.slug}</p>
                            </div>
                            <span className={`barb-status ${barb.activo ? 'active' : 'inactive'}`}>
                                {barb.activo ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>

                        <div className="barb-metrics">
                            <div className="barb-metric">
                                <span className="barb-metric-value">{barb.total_clientes || 0}</span>
                                <span className="barb-metric-label">Clientes</span>
                            </div>
                            <div className="barb-metric">
                                <span className="barb-metric-value">{barb.total_citas || 0}</span>
                                <span className="barb-metric-label">Citas</span>
                            </div>
                            <div className="barb-metric">
                                <span className="barb-metric-value">{barb.total_usuarios || 0}</span>
                                <span className="barb-metric-label">Staff</span>
                            </div>
                        </div>

                        <div className="barb-plan-row">
                            <span>
                                <span className="barb-plan-badge">{barb.plan}</span>
                                {' '} ${barb.precio_plan?.toLocaleString()} MXN
                            </span>
                            <span>
                                Vence: {barb.fecha_vencimiento ? new Date(barb.fecha_vencimiento).toLocaleDateString('es-MX') : 'N/A'}
                            </span>
                        </div>

                        <div className="barb-actions">
                            <a
                                className="btn-wa"
                                href={buildWhatsAppLink(barb)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <MessageCircle size={16} /> Cobrar Renovacion
                            </a>
                            <button
                                className={`btn-toggle ${barb.activo ? 'deactivate' : 'activate'}`}
                                onClick={() => toggleBarberia(barb.id)}
                            >
                                <Power size={14} /> {barb.activo ? 'Desactivar' : 'Activar'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
