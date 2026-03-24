import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { superAdminService, configuracionService } from '../services/api';
import { QrCode, Copy, Download, CheckCircle, Store, Calendar, Tag, Link as LinkIcon, Palette, Sparkles, Upload, Save, MapPin } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';

export default function ConfiguracionPage() {
    const { user, updateUserIdentity } = useAuth();
    const { applyTheme } = useTheme();
    const [barberia, setBarberia] = useState(null);
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [theme, setTheme] = useState('default');
    
    // Archivos
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [loyaltyFile, setLoyaltyFile] = useState(null);
    const [loyaltyPreview, setLoyaltyPreview] = useState(null);
    
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
                setNombre(data.nombre || '');
                setDireccion(data.direccion || '');
                setTheme(data.theme || 'default');
                setLogoPreview(data.logo_url || null);
                setLoyaltyPreview(data.loyalty_card_image_url || null);
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

    async function handleSaveProfile(e) {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const formData = new FormData();
            formData.append('nombre', nombre);
            formData.append('direccion', direccion);
            formData.append('theme', theme);
            if (logoFile) {
                formData.append('logo', logoFile);
            }
            if (loyaltyFile) {
                formData.append('loyalty_card', loyaltyFile);
            }

            const res = await configuracionService.updateBarberiaSettings(barberia.id, formData);
            if (res.data) {
                toast.success('Perfil actualizado correctamente');
                // Actualizar contexto global para sync visual
                updateUserIdentity({
                    barberia_nombre: nombre,
                    logo_url: res.data.updates.logo_url || barberia.logo_url
                });
                setBarberia(prev => ({
                    ...prev,
                    nombre,
                    direccion,
                    theme,
                    logo_url: res.data.updates.logo_url || prev.logo_url,
                    loyalty_card_image_url: res.data.updates.loyalty_card_image_url || prev.loyalty_card_image_url
                }));
                // Limpiar archivos
                setLogoFile(null);
                setLoyaltyFile(null);
            }
        } catch (err) {
            console.error('Error guardando perfil:', err);
            toast.error(err.response?.data?.error || 'Error al guardar perfil');
        } finally {
            setSavingProfile(false);
        }
    }

    function handleLogoChange(e) {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    }

    function handleLoyaltyChange(e) {
        const file = e.target.files[0];
        if (file) {
            setLoyaltyFile(file);
            setLoyaltyPreview(URL.createObjectURL(file));
        }
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
        <form onSubmit={handleSaveProfile} style={{ padding: '1rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
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

                {/* ══════════════ INFO DE BARBERÍA (EDITABLE) ══════════════ */}
                <div style={{ ...cardStyle, gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--accent-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Store size={22} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Perfil Comercial</h2>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Identidad gráfica y ubicación</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
                        {/* Logo de la Marca */}
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'var(--bg-input)' }}>
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                ) : null}
                                <div style={{ display: logoPreview ? 'none' : 'block' }}>
                                    <Store size={24} style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logo de la Marca</label>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-main)', transition: 'all 0.2s', whiteSpace: 'nowrap', maxWidth: 'fit-content' }}>
                                    <Upload size={14} /> Subir Imagen
                                    <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>

                        {/* Nombre Comercial */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Nombre Comercial</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}
                                placeholder="Ej. The Gangsta"
                                required
                            />
                        </div>

                        {/* Dirección */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ubicación Física</label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}
                                    placeholder="Ej. Calle Madero #100, Oaxaca"
                                />
                            </div>
                        </div>
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
                                type="button"
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

                {/* ══════════════ IDENTIDAD DEL PORTAL (CLIENTES) ══════════════ */}
                <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--accent-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Store size={22} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Identidad del Portal (Clientes)</h2>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configura la vista pública para tus clientes</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '2rem', alignItems: 'start' }}>
                        {/* Selector Visual de Tema del Portal */}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tema del Portal de Clientes</label>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                                    Este tema pintará el portal público la próxima vez que el cliente entre.
                                </p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                                {/* Opción Default */}
                                <button
                                    type="button"
                                    onClick={() => setTheme('default')}
                                    style={{
                                        position: 'relative',
                                        padding: '0.75rem',
                                        borderRadius: '16px',
                                        border: theme === 'default' ? '2px solid #6366F1' : '2px solid transparent',
                                        background: theme === 'default' ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-input)',
                                        boxShadow: theme === 'default' ? '0 4px 20px rgba(99, 102, 241, 0.15)' : 'none',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {theme === 'default' && (
                                        <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: '#6366F1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}>
                                            <CheckCircle size={14} />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '2px', height: '32px', borderRadius: '8px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', marginBottom: '0.5rem' }}>
                                        <div style={{ flex: 1, backgroundColor: '#0a0a0f' }}></div>
                                        <div style={{ flex: 1, backgroundColor: '#12121a' }}></div>
                                        <div style={{ flex: 1, backgroundColor: '#6366F1' }}></div>
                                        <div style={{ flex: 1, backgroundColor: '#818CF8' }}></div>
                                    </div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Flow Estándar</span>
                                </button>

                                {/* Temas dinámicos */}
                                {themes.map(t => {
                                    const slug = t.nombre.toLowerCase().replace(/\s+/g, '_');
                                    const isSelected = theme === slug;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTheme(slug)}
                                            style={{
                                                position: 'relative',
                                                padding: '0.75rem',
                                                borderRadius: '16px',
                                                border: isSelected ? '2px solid #6366F1' : '2px solid transparent',
                                                background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-input)',
                                                boxShadow: isSelected ? '0 4px 20px rgba(99, 102, 241, 0.15)' : 'none',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {isSelected && (
                                                <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: '#6366F1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}>
                                                    <CheckCircle size={14} />
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '2px', height: '32px', borderRadius: '8px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', marginBottom: '0.5rem' }}>
                                                <div style={{ flex: 1, backgroundColor: t.bg_main }}></div>
                                                <div style={{ flex: 1, backgroundColor: t.bg_surface }}></div>
                                                <div style={{ flex: 1, backgroundColor: t.accent_primary }}></div>
                                                <div style={{ flex: 1, backgroundColor: t.accent_secondary }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nombre}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Uploaders Divididos */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {/* Logo del Portal */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logo del Portal</label>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '16px', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'var(--bg-input)' }}>
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                        ) : null}
                                        <div style={{ display: logoPreview ? 'none' : 'block' }}>
                                            <Store size={24} style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-main)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                                            <Upload size={14} /> Subir Logo
                                            <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Fondo de Lealtad */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fondo Tarjeta Lealtad</label>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '90px', height: '60px', borderRadius: '12px', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'var(--bg-input)' }}>
                                        {loyaltyPreview ? (
                                            <img src={loyaltyPreview} alt="Loyalty preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                        ) : null}
                                        <div style={{ display: loyaltyPreview ? 'none' : 'block' }}>
                                            <Sparkles size={24} style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-main)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                                            <Upload size={14} /> Subir Fondo
                                            <input type="file" accept="image/*" onChange={handleLoyaltyChange} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            disabled={savingProfile}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.875rem 2rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'var(--accent-primary)',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: savingProfile ? 'wait' : 'pointer',
                                opacity: savingProfile ? 0.7 : 1,
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 15px rgba(var(--accent-primary-rgb), 0.3)'
                            }}
                        >
                            {savingProfile ? (
                                <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div> Guardando Cambios...</>
                            ) : (
                                <><Save size={20} /> Guardar Cambios de Perfil e Identidad</>
                            )}
                        </button>
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
        </form>
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
