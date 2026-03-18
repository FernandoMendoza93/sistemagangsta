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

    // La URL base del portal de esta barbería — se computa desde el estado del API fetch
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
            // Fetch barberia info & themes
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
                // IMPORTANTE: Evitar que el nombre del tema sobrescriba el nombre de la barbería
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

        // Serializar el SVG y convertir a PNG via canvas
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fondo blanco
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                    ⚙️ Configuración
                </h1>
                <p className="text-gray-500 mt-1">Gestiona tu portal de clientes y la identidad de tu barbería</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ══════════════ QR GENERATOR ══════════════ */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                            <QrCode size={22} className="text-coral" style={{ color: '#FF6B4A' }} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 text-lg">Código QR del Portal</h2>
                            <p className="text-xs text-gray-400">Imprímelo y pégalo en tu local</p>
                        </div>
                    </div>

                    {/* QR Code */}
                    {portalUrl ? (
                        <div ref={qrRef} className="flex justify-center">
                            <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-inner inline-block">
                                <QRCode
                                    value={portalUrl}
                                    size={200}
                                    fgColor="#1a1a1a"
                                    bgColor="#ffffff"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center p-8 bg-gray-50 rounded-xl">
                            <p className="text-gray-400 text-sm text-center">
                                No se encontró el slug de tu barbería.<br/>
                                Contacta al soporte de Flow.
                            </p>
                        </div>
                    )}

                    {/* URL del portal */}
                    {portalUrl && (
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                            <LinkIcon size={14} className="text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-600 truncate font-mono">{portalUrl}</span>
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleCopyLink}
                            disabled={!portalUrl}
                            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-40"
                        >
                            {copied ? (
                                <><CheckCircle size={16} className="text-green-500" /> Copiado</>
                            ) : (
                                <><Copy size={16} /> Copiar Enlace</>
                            )}
                        </button>
                        <button
                            onClick={handleDownloadQR}
                            disabled={!portalUrl}
                            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-medium text-white active:scale-95 transition-all disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #FF6B4A, #e55a3a)' }}
                        >
                            <Download size={16} /> Descargar QR
                        </button>
                    </div>
                </div>

                {/* ══════════════ SELECTOR DE TEMAS ══════════════ */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <Palette size={22} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900 text-lg">Personalización Visual</h2>
                                <p className="text-xs text-gray-400">Elige el tema que mejor represente a tu barbería</p>
                            </div>
                        </div>
                        {saving && <span className="text-xs text-indigo-500 animate-pulse font-bold">Guardando cambios...</span>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {themes.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleSelectTheme(t)}
                                disabled={saving}
                                className={`relative group p-4 rounded-[24px] border-2 transition-all text-left hover:scale-[1.02] ${
                                    barberia?.tema_id === t.id 
                                    ? 'border-indigo-500 bg-indigo-50/10 shadow-lg' 
                                    : 'border-transparent bg-gray-50/50 hover:bg-white hover:border-gray-200'
                                }`}
                            >
                                {barberia?.tema_id === t.id && (
                                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md animate-in fade-in zoom-in">
                                        <CheckCircle size={18} />
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-gray-900">{t.nombre}</h4>
                                    <Sparkles size={16} className={barberia?.tema_id === t.id ? 'text-indigo-500' : 'text-gray-300'} />
                                </div>

                                <div className="space-y-3">
                                    {/* Preview Palette */}
                                    <div className="flex gap-1 h-12 rounded-xl overflow-hidden shadow-inner">
                                        <div className="flex-1" style={{ backgroundColor: t.bg_main }}></div>
                                        <div className="flex-1" style={{ backgroundColor: t.bg_surface }}></div>
                                        <div className="flex-1" style={{ backgroundColor: t.accent_primary }}></div>
                                        <div className="flex-1" style={{ backgroundColor: t.accent_secondary }}></div>
                                    </div>

                                    {/* Small visual items */}
                                    <div className="flex justify-between items-center px-1">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.accent_primary }}></div>
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.accent_secondary }}></div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: t.text_main }}>Flow ADN</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══════════════ INFO DE BARBERÍA ══════════════ */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                            <Store size={22} style={{ color: '#FF6B4A' }} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 text-lg">Tu Barbería</h2>
                            <p className="text-xs text-gray-400">Información de tu cuenta en Flow</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <InfoRow
                            icon={<Store size={16} />}
                            label="Nombre"
                            value={barberia?.nombre || user?.barberia_nombre || '—'}
                        />
                        <InfoRow
                            icon={<LinkIcon size={16} />}
                            label="Slug (URL)"
                            value={barberia?.slug || slug || '—'}
                            mono
                        />
                        <InfoRow
                            icon={<Tag size={16} />}
                            label="Color acento"
                            value={
                                <span className="flex items-center gap-2">
                                    <span
                                        className="w-4 h-4 rounded-full border border-gray-200"
                                        style={{ background: barberia?.color_acento || '#FF6B4A' }}
                                    ></span>
                                    {barberia?.color_acento || '#FF6B4A'}
                                </span>
                            }
                        />
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">
                            Para modificar estos datos, contacta al soporte de Flow ✉️
                        </p>
                    </div>
                </div>

                {/* ══════════════ INSTRUCCIONES ══════════════ */}
                <div className="lg:col-span-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <QrCode size={18} style={{ color: '#FF6B4A' }} />
                        ¿Cómo usar el QR?
                    </h3>
                    <ol className="space-y-2 text-sm text-gray-600">
                        <li className="flex gap-3">
                            <span className="font-bold text-orange-400 shrink-0">1.</span>
                            Descarga el QR o copia el enlace con los botones de arriba.
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-orange-400 shrink-0">2.</span>
                            Imprímelo y pégalo en la recepción, espejos o mesa de espera.
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-orange-400 shrink-0">3.</span>
                            Tus clientes lo escanean, ven tu barbería personalizada y se registran.
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-orange-400 shrink-0">4.</span>
                            Cada cliente que inicie sesión queda anclado a tu barbería automáticamente.
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value, mono }) {
    return (
        <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <span className="text-gray-400 shrink-0">{icon}</span>
            <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
            <span className={`text-sm font-medium text-gray-800 ${mono ? 'font-mono' : ''}`}>
                {value}
            </span>
        </div>
    );
}
