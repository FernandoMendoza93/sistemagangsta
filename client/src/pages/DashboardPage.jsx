import { useState, useEffect } from 'react';
import { ventasService, productosService, citasService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import CierreServicioModal from '../components/CierreServicioModal';
import './DashboardPage.css';

const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


export default function DashboardPage() {
    const { user, isEncargado, isBarbero } = useAuth();
    const [resumen, setResumen] = useState(null);
    const [alertas, setAlertas] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [citasHoy, setCitasHoy] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [citaSeleccionada, setCitaSeleccionada] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const fechaHoy = getLocalDate();
            const [resumenRes, alertasRes, ventasRes, citasRes, semanaRes] = await Promise.all([
                ventasService.getResumenHoy(),
                isEncargado() ? productosService.getAlertas() : Promise.resolve({ data: [] }),
                ventasService.getAll({ fecha: fechaHoy }),
                citasService.getAll ? citasService.getAll(fechaHoy) : Promise.resolve({ data: [] }),
                ventasService.getResumenSemana()
            ]);

            setResumen(resumenRes.data);
            setAlertas(alertasRes.data);
            setVentas(ventasRes.data);

            // Filter only pending appointments for the bento grid
            const pendingCitas = (citasRes.data || []).filter(c => c.estado === 'Pendiente').slice(0, 6);
            setCitasHoy(pendingCitas);

            setChartData(semanaRes.data || []);
        } catch (error) {
            console.error('Error cargando dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner" style={{ borderColor: 'var(--accent-primary)' }}></div></div>;
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <>
        <motion.div
            className="dashboard-container"
            initial="hidden"
            animate="show"
            variants={containerVariants}
        >
            <motion.div className="page-header dashboard-header-glow" variants={itemVariants}>
                <div>
                    <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                        Bienvenido, <span style={{ color: 'var(--accent-primary)' }}>{user?.nombre}</span>
                    </h1>
                    <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>
                        Panel de Control - {new Date().toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </motion.div>

            <motion.div className="card-grid" variants={containerVariants}>
                <motion.div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.25rem 1.5rem', boxShadow: '0 8px 32px var(--shadow-color)', display: 'flex', alignItems: 'center', gap: '1rem' }} variants={itemVariants}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                        <Icon name="dollar-sign" size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>${parseFloat(resumen?.ingresos_totales || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ingresos del Día</div>
                    </div>
                </motion.div>

                <motion.div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.25rem 1.5rem', boxShadow: '0 8px 32px var(--shadow-color)', display: 'flex', alignItems: 'center', gap: '1rem' }} variants={itemVariants}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                        <Icon name="shopping-cart" size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{resumen?.total_ventas || 0}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ventas Totales</div>
                    </div>
                </motion.div>

                <motion.div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.25rem 1.5rem', boxShadow: '0 8px 32px var(--shadow-color)', display: 'flex', alignItems: 'center', gap: '1rem' }} variants={itemVariants}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                        <Icon name="credit-card" size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>${parseFloat(resumen?.tarjeta || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Tarjeta / Transf.</div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Gráfica de Ingresos — oculta para Barberos (solo ven sus propios datos) */}
            {!isBarbero() && (
                <motion.div className="premium-card" variants={itemVariants} style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                    <div className="card-header" style={{ marginBottom: '0' }}>
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon name="trending-up" size={20} color="var(--accent-primary)" />
                            Flujo de Ingresos (Semana)
                        </h2>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)' }}
                                    itemStyle={{ color: 'var(--accent-primary)' }}
                                />
                                <Area type="monotone" dataKey="ingresos" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            )}

            <div className="card-grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)', alignItems: 'start' }}>
                {/* Tabla de Ventas (Izquierda, más grande) */}
                <motion.div className="premium-card" variants={itemVariants}>
                    <div className="card-header">
                        <h2 className="card-title">Últimas Ventas</h2>
                    </div>
                    <div className="modern-table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Hora</th>
                                    <th>Barbero</th>
                                    <th>Método</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ventas.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sin ventas hoy</td>
                                    </tr>
                                ) : (
                                    ventas.slice(0, 8).map(v => (
                                        <tr key={v.id}>
                                            <td style={{ fontWeight: 600 }}>{new Date(v.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>{v.barbero || 'General'}</td>
                                            <td>
                                                <span className={`glow-badge ${v.metodo_pago === 'Efectivo' ? 'success' : v.metodo_pago === 'Tarjeta' ? 'info' : 'warning'}`}>
                                                    {v.metodo_pago}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                                                ${v.total_venta.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Columna Derecha: Bento Grid Citas + Alertas */}
                <motion.div variants={containerVariants} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Bento Grid: Próximas Citas */}
                    <motion.div className="premium-card" variants={itemVariants} style={{ padding: '1.25rem' }}>
                        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
                            <h2 className="card-title" style={{ fontSize: '1.1rem' }}>Próximas Citas</h2>
                        </div>
                        {citasHoy.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay citas pendientes.</p>
                        ) : (
                            <div className="bento-grid" style={{ gridTemplateColumns: '1fr' }}>
                                {citasHoy.map(cita => (
                                    <div key={cita.id} className="bento-item" style={{ gap: '0.4rem' }}>
                                        <div className="bento-time">{cita.hora}</div>
                                        <div className="bento-service">{cita.nombre_servicio}</div>
                                        <div className="bento-client">
                                            <Icon name="user" size={14} />
                                            {cita.cliente_nombre.split(' ')[0]}
                                        </div>
                                        <button
                                            onClick={() => { setCitaSeleccionada(cita); setShowModal(true); }}
                                            style={{
                                                marginTop: '0.4rem',
                                                padding: '0.35rem 0.8rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--accent-primary)',
                                                background: 'transparent',
                                                color: 'var(--accent-primary)',
                                                fontSize: '0.77rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                transition: 'all 0.2s'
                                            }}
                                            className="hover:bg-[var(--accent-primary)] hover:text-[var(--bg-surface)]"
                                        >
                                            <Icon name="check-circle" size={13} />
                                            Completar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Stock Alerts */}
                    {alertas.length > 0 && isEncargado() && (
                        <motion.div className="premium-card" variants={itemVariants} style={{ padding: '1.25rem', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
                            <div className="card-header" style={{ marginBottom: '1rem' }}>
                                <div className="card-title-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon name="alert-triangle" size={20} color="#F43F5E" />
                                    <h2 className="card-title" style={{ fontSize: '1.1rem', color: 'var(--danger, #fb7185)' }}>Stock Crítico</h2>
                                </div>
                            </div>
                            <div>
                                {alertas.slice(0, 3).map(p => (
                                    <div key={p.id} className="stock-alert-item">
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{p.nombre}</strong>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mínimo: {p.stock_minimo}</span>
                                        </div>
                                        <div className="glow-badge danger">
                                            Quedan {p.stock_actual}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </motion.div>

        {/* Modal de Cierre de Servicio */}
        {showModal && citaSeleccionada && (
            <CierreServicioModal
                cita={citaSeleccionada}
                onClose={() => { setShowModal(false); setCitaSeleccionada(null); }}
                onSuccess={() => {
                    setShowModal(false);
                    setCitaSeleccionada(null);
                    loadData();
                }}
            />
        )}
        </>
    );
}
