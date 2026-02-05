
import { useState, useEffect } from 'react';

const DENOMINATIONS = [
    { value: 1000, type: 'bill', label: '$1,000' },
    { value: 500, type: 'bill', label: '$500' },
    { value: 200, type: 'bill', label: '$200' },
    { value: 100, type: 'bill', label: '$100' },
    { value: 50, type: 'bill', label: '$50' },
    { value: 20, type: 'bill', label: '$20' },
    { value: 10, type: 'coin', label: '$10' },
    { value: 5, type: 'coin', label: '$5' },
    { value: 2, type: 'coin', label: '$2' },
    { value: 1, type: 'coin', label: '$1' },
    { value: 0.5, type: 'coin', label: '50¢' }
];

export default function CashDenominationCounter({ onTotalChange }) {
    const [counts, setCounts] = useState({});

    useEffect(() => {
        const total = DENOMINATIONS.reduce((sum, denom) => {
            return sum + (denom.value * (counts[denom.value] || 0));
        }, 0);
        onTotalChange(total);
    }, [counts, onTotalChange]);

    const handleCountChange = (value, count) => {
        const newCount = Math.max(0, parseInt(count) || 0);
        setCounts(prev => ({ ...prev, [value]: newCount }));
    };

    return (
        <div className="denomination-counter">
            <h3 style={{ marginBottom: '1rem' }}>🧮 Asistente de Conteo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                {DENOMINATIONS.map(denom => (
                    <div key={denom.value} className="denomination-card" style={{
                        border: '1px solid var(--border)',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: denom.type === 'bill' ? 'rgba(0, 255, 0, 0.05)' : 'rgba(255, 215, 0, 0.05)'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: denom.type === 'bill' ? '#2e7d32' : '#fbc02d' }}>
                            {denom.label}
                        </div>
                        <input
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ textAlign: 'center', width: '100%' }}
                            placeholder="0"
                            value={counts[denom.value] || ''}
                            onChange={(e) => handleCountChange(denom.value, e.target.value)}
                        />
                        <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-secondary)' }}>
                            = ${(counts[denom.value] || 0) * denom.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
