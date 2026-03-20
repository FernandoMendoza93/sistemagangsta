import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { superAdminService } from '../services/api';
import { QrCode, Copy, Download, CheckCircle, Store, Calendar, Tag, Link as LinkIcon, Palette, Sparkles } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';

export default function ConfiguracionPage() {
    const { user } = useAuth();
    const { applyTheme } = useTheme();
    const [barberia, setBarberia] = useState(null);
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const qrRef = useRef(null);

    const slug = barberia?.slug || user?.barberia_slug || null;
    const portalUrl = slug
        ? `${window.location.origin}/portal/${slug}`
        : null;

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [barberiaRes, themesRes] = await Promise.all([
                fetch(`/api/super/barberias/${user.barberia_id}/config`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/super/temas', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (barberiaRes.ok) {
                const data = await barberiaRes.json();
                setBarberia(data);
                if (data.bg_main) applyTheme(data, data.id);
            }

            if (themesRes.ok) {
                const themesData = await themesRes.json();
                setThemes(themesData);
            }
        } catch (err) {
            console.error('Error cargando data:', err);
            toast.error('Error al cargar configuración');
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectTheme(theme) {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/super/barberias/${barberia.id}/tema`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ tema_id: theme.id })
            });

            if (res.ok) {
                applyTheme(theme, barberia.id);
                setBarberia(prev => ({
                    ...prev,
                    tema_id: theme.id,
                    bg_main: theme.bg_main,
                    bg_surface: theme.bg_surface,
                    accent_primary: theme.accent_primary,
                    accent_secondary: theme.accent_secondary,
                    text_main: theme.text_main,
                    text_muted: theme.text_muted,
                    clase_glass: theme.clase_glass
                }));
                toast.success(`Tema "${theme.nombre}" aplicado correctamente`);
            } else {
                throw new Error('Error al actualizar tema');
            }
        } catch (err) {
            toast.error('No se pudo guardar el tema');
        } finally {
            setSaving(false);
        }
    }

    function handleCopyLink() {
        if (!portalUrl) return;
        navigator.clipboard.writeText(portalUrl)
            .then(() => {
                setCopied(true);
                toast.success('¡Enlace copiado al portapapeles!');
                setTimeout(() => setCopied(false), 2500);
            })
            .catch(() => toast.error('No se pudo copiar. Copia el enlace manualmente.'));
    }

    function handleDownloadQR() {
        const svgEl = qrRef.current?.querySelector('svg');
        if (!svgEl) return;

        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            const padding = 32;
            ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2);
            URL.revokeObjectURL(svgUrl);

            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `QR-Portal-${barberia?.slug || 'barberia'}.png`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('QR descargado correctamente');
            }, 'image/png');
        };
        img.src = svgUrl;
    }

    const cardStyle = {
        background: 'var(--bg-surface)',
        borderRadius: '20px',
        boxShadow: '0 4px 20px var(--shadow-color)',
        border: '1px solid var(--border-color)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
                <div className="spinner" style={{ borderColor: 'var(--accent-primary)' }}></div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    ⚙️ Configuración
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Gestiona tu portal de clientes y la identidad de tu barbería</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* ══════════════ QR GENERATOR ══════════════ */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--accent-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <QrCode size={22} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Código QR del Portal</h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Imprímelo y pégalo en tu local</p>
                        </div>
                    </div>

                    {portalUrl ? (
                        <div ref={qrRef} style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '16px', border: '2px solid var(--border-color)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)', display: 'inline-block' }}>
                                <QRCode
                                    value={portalUrl}
                                    size={200}
                                    fgColor="#1a1a1a"
                                    bgColor="#ffffff"
                                />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', background: 'var(--bg-input)', borderRadius: '12px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                                No se encontró el slug de tu barbería.<br />
                                Contacta al soporte de Flow.
                            </p>
                        </div>
                    )}

                    {portalUrl && (
                        <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <LinkIcon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{portalUrl}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={handleCopyLink}
                            disabled={!portalUrl}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                minHeight: '44px',
                                padding: '0 1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'var(--text-main)',
                                background: 'var(--bg-surface)',
                                cursor: portalUrl ? 'pointer' : 'not-allowed',
                                opacity: portalUrl ? 1 : 0.4,
                                transition: 'all 0.2s'
                            }}
                        >
                            {copied ? (
                                <><CheckCircle size={16} style={{ color: '#10B981' }} /> Copiado</>
                            ) : (
                                <><Copy size={16} /> Copiar Enlace</>
                            )}
                        </button>
                        <button
                            onClick={handleDownloadQR}
                            disabled={!portalUrl}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                minHeight: '44px',
                                padding: '0 1rem',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#fff',
                                background: 'var(--accent-primary)',
                                cursor: portalUrl ? 'pointer' : 'not-allowed',
                                opacity: portalUrl ? 1 : 0.4,
                                transition: 'all 0.2s'
                            }}
                        >
                            <Download size={16} /> Descargar QR
                        </button>
                    </div>
                </div>

                {/* ══════════════ INFO DE BARBERÍA ══════════════ */}
                <div style={{ ...cardStyle, gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--accent-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Store size={22} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Tu Barbería</h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Información de tu cuenta en Flow</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <InfoRow icon={<Store size={16} />} label="Nombre" value={barberia?.nombre || user?.barberia_nombre || '—'} />
                        <InfoRow icon={<LinkIcon size={16} />} label="Slug (URL)" value={barberia?.slug || slug || '—'} mono />
                        <InfoRow
                            icon={<Tag size={16} />}
                            label="Color acento"
                            value={
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid var(--border-color)', background: barberia?.color_acento || 'var(--accent-primary)' }}></span>
                                    {barberia?.color_acento || 'var(--accent-primary)'}
                                </span>
                            }
                        />
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            Para modificar estos datos, contacta al soporte de Flow ✉️
                        </p>
                    </div>
                </div>

                {/* ══════════════ SELECTOR DE TEMAS ══════════════ */}
                <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Palette size={22} style={{ color: '#6366F1' }} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Personalización Visual</h2>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Elige el tema que mejor represente a tu barbería</p>
                            </div>
                        </div>
                        {saving && <span style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 700 }}>Guardando cambios...</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                        {themes.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleSelectTheme(t)}
                                disabled={saving}
                                style={{
                                    position: 'relative',
                                    padding: '1rem',
                                    borderRadius: '24px',
                                    border: barberia?.tema_id === t.id ? '2px solid #6366F1' : '2px solid transparent',
                                    background: barberia?.tema_id === t.id ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-input)',
                                    boxShadow: barberia?.tema_id === t.id ? '0 4px 20px rgba(99, 102, 241, 0.15)' : 'none',
                                    textAlign: 'left',
                                    cursor: saving ? 'wait' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {barberia?.tema_id === t.id && (
                                    <div style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: '#6366F1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}>
                                        <CheckCircle size={18} />
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>{t.nombre}</h4>
                                    <Sparkles size={16} style={{ color: barberia?.tema_id === t.id ? '#6366F1' : 'var(--text-muted)' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', gap: '2px', height: '48px', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                                        <div style={{ flex: 1, backgroundColor: t.bg_main }}></div>
                                        <div style={{ flex: 1, backgroundColor: t.bg_surface }}></div>
                                        <div style={{ flex: 1, backgroundColor: t.accent_primary }}></div>
                                        <div style={{ flex: 1, backgroundColor: t.accent_secondary }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.accent_primary }}></div>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.accent_secondary }}></div>
                                        </div>
                                        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px', color: t.text_main }}>Flow ADN</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══════════════ INSTRUCCIONES ══════════════ */}
                <div style={{ gridColumn: '1 / -1', background: 'rgba(var(--accent-primary-rgb), 0.06)', borderRadius: '20px', padding: '1.5rem', border: '1px solid rgba(var(--accent-primary-rgb), 0.15)' }}>
                    <h3 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <QrCode size={18} style={{ color: 'var(--accent-primary)' }} />
                        ¿Cómo usar el QR?
                    </h3>
                    <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
                        {[
                            'Descarga el QR o copia el enlace con los botones de arriba.',
                            'Imprímelo y pégalo en la recepción, espejos o mesa de espera.',
                            'Tus clientes lo escanean, ven tu barbería personalizada y se registran.',
                            'Cada cliente que inicie sesión queda anclado a tu barbería automáticamente.'
                        ].map((text, i) => (
                            <li key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                                <span style={{ fontWeight: 700, color: 'var(--accent-primary)', flexShrink: 0 }}>{i + 1}.</span>
                                {text}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value, mono }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '80px', flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', fontFamily: mono ? 'monospace' : 'inherit' }}>
                {value}
            </span>
        </div>
    );
}
