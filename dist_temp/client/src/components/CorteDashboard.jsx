
import React from 'react';

export default function CorteDashboard({ initial, ingresos, gastos, esperado, real, status }) {
    const getStatusColor = () => {
        if (!real) return 'var(--text-primary)';
        const diff = real - esperado;
        if (Math.abs(diff) < 1) return '#4caf50'; // Verde (Exacto)
        if (diff > 0) return '#ffeb3b'; // Amarillo (Sobrante)
        return '#f44336'; // Rojo (Faltante)
    };

    return (
        <div className="corte-dashboard" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <DashboardCard title="Fondo Inicial" value={initial} icon="💰" color="var(--primary)" />
            <DashboardCard title="Ventas Efectivo" value={ingresos} icon="💵" color="#4caf50" />
            <DashboardCard title="Gastos/Salidas" value={gastos} icon="💸" color="#f44336" />

            <div className="dashboard-card" style={{
                flex: 1,
                minWidth: '200px',
                padding: '1.5rem',
                borderRadius: '12px',
                backgroundColor: 'var(--card-bg)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                border: '1px solid var(--border)',
                borderLeft: `5px solid ${getStatusColor()}`
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Dinero Esperado</span>
                    <span style={{ fontSize: '1.5rem' }}>🎯</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>${esperado?.toFixed(2)}</div>
                {real > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: getStatusColor(), fontWeight: 'bold' }}>
                        Diferencia: ${(real - esperado).toFixed(2)}
                    </div>
                )}
            </div>
        </div>
    );
}

function DashboardCard({ title, value, icon, color }) {
    return (
        <div className="dashboard-card" style={{
            flex: 1,
            minWidth: '200px',
            padding: '1.5rem',
            borderRadius: '12px',
            backgroundColor: 'var(--card-bg)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid var(--border)',
            borderLeft: `5px solid ${color}`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{title}</span>
                <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>${value?.toFixed(2) || '0.00'}</div>
        </div>
    );
}
