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
    const [notes, setNotes] = useState(""); // Estado para las notas

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

    // Estilo común para los inputs para evitar el fondo negro
    const inputStyle = {
        textAlign: 'center',
        width: '100%',
        color: '#333333', // Texto gris oscuro/negro
        backgroundColor: '#ffffff', // Fondo blanco explícito
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '5px'
    };

    return (
        <div className="denomination-counter">
            <div className="denomination-grid">
                {DENOMINATIONS.map(denom => (
                    <div key={denom.value} className="denomination-card" style={{
                        border: '1px solid #e0e0e0',
                        padding: '0.4rem',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: denom.type === 'bill' ? 'rgba(46, 125, 50, 0.05)' : 'rgba(251, 192, 45, 0.05)'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem', color: denom.type === 'bill' ? '#2e7d32' : '#b8860b' }}>
                            {denom.label}
                        </div>
                        <input
                            type="number"
                            min="0"
                            style={inputStyle}
                            placeholder="0"
                            value={counts[denom.value] || ''}
                            onChange={(e) => handleCountChange(denom.value, e.target.value)}
                        />
                        <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: '#666' }}>
                            = ${((counts[denom.value] || 0) * denom.value).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Sección de Notas Corregida */}
            <div style={{ marginTop: '10px' }}>
                <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>
                    Notas (Opcional)
                </label>
                <textarea
                    placeholder="Observaciones del cierre..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                        width: '100%',
                        minHeight: '40px',
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        backgroundColor: '#ffffff',
                        color: '#333333',
                        fontSize: '13px',
                        resize: 'vertical'
                    }}
                />
            </div>
        </div>
    );
}
