import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { superAdminService, configuracionService } from '../services/api';
import { QrCode, Copy, Download, CheckCircle, Store, Calendar, Tag, Link as LinkIcon, Palette, Sparkles, Upload, Save, MapPin, Server, Mail, Key, FileText, Clock, Bell, Users, MessageSquare, CalendarRange } from 'lucide-react';
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
    const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('');
    const [theme, setTheme] = useState('default');
    
    // Archivos
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [loyaltyFile, setLoyaltyFile] = useState(null);
    const [loyaltyPreview, setLoyaltyPreview] = useState(null);

    // Landing Page Portal
    const [landingTitulo, setLandingTitulo] = useState('Bienvenido a nuestra barbería');
    const [landingDescripcion, setLandingDescripcion] = useState('Agenda tu cita, acumula puntos y accede a beneficios exclusivos.');
    const [landingImagenFile, setLandingImagenFile] = useState(null);
    const [landingImagenPreview, setLandingImagenPreview] = useState(null);
    const [savingLanding, setSavingLanding] = useState(false);

    // Ajustes SMTP
    const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
    const [smtpPort, setSmtpPort] = useState(465);
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPass, setSmtpPass] = useState('');
    const [smtpFromName, setSmtpFromName] = useState('');
    const [smtpSecure, setSmtpSecure] = useState(true);

    // Preferencias de Reportes
    const [reportPeriod, setReportPeriod] = useState('semanal');
    const [reportEnabled, setReportEnabled] = useState(true);
    const [emailsReporte, setEmailsReporte] = useState('');
    const [diaReporte, setDiaReporte] = useState('Viernes');
    const [horaReporte, setHoraReporte] = useState('18:00');
    const [admins, setAdmins] = useState([]);
    const [adminsLoaded, setAdminsLoaded] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);

    // Fidelización
    const [fidelizacionActiva, setFidelizacionActiva] = useState(false);
    const [diasInactividad, setDiasInactividad] = useState(30);
    const [mensajeFidelizacion, setMensajeFidelizacion] = useState('Hola {nombre_cliente}, te echamos de menos. ¡Regresa pronto para un gran corte!');
    
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
            const [barberiaRes, themesRes, smtpRes, usuariosRes] = await Promise.all([
                fetch(`/api/super/barberias/${user.barberia_id}/config`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/super/temas', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/settings/smtp', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/usuarios/staff-admin', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (barberiaRes.ok) {
                const data = await barberiaRes.json();
                setBarberia(data);
                setNombre(data.nombre || '');
                setDireccion(data.direccion || '');
                setTelefonoWhatsapp(data.telefono_whatsapp || '');
                setTheme(data.theme || 'default');
                setLogoPreview(data.logo_url || null);
                setLoyaltyPreview(data.loyalty_card_image_url || null);
                
                // Cargar datos de la landing
                setLandingTitulo(data.landing_titulo || 'Bienvenido a nuestra barbería');
                setLandingDescripcion(data.landing_descripcion || 'Agenda tu cita, acumula puntos y accede a beneficios exclusivos.');
                setLandingImagenPreview(data.landing_imagen_fondo || null);

                if (data.bg_main) applyTheme(data, data.id);
            }

            if (smtpRes.ok) {
                const smtpData = await smtpRes.json();
                if (smtpData.isConfigured) {
                    setSmtpHost(smtpData.smtp_host || 'smtp.gmail.com');
                    setSmtpPort(smtpData.smtp_port || 587);
                    setSmtpUser(smtpData.smtp_user || '');
                    setSmtpPass(smtpData.smtp_pass || '');
                    setSmtpFromName(smtpData.smtp_from_name || '');
                    setSmtpSecure(!!smtpData.smtp_secure);
                    setReportEnabled(smtpData.enviar_reportes);
                    setReportPeriod(smtpData.frecuencia_reporte || 'semanal');
                    setEmailsReporte(smtpData.emails_reporte || '');
                    setDiaReporte(smtpData.dia_reporte || 'Viernes');
                    setHoraReporte(smtpData.hora_reporte || '18:00');
                    setFidelizacionActiva(!!smtpData.fidelizacion_activa);
                    setDiasInactividad(smtpData.dias_inactividad || 30);
                    setMensajeFidelizacion(smtpData.mensaje_fidelizacion || 'Hola {nombre_cliente}, te echamos de menos. ¡Regresa pronto para un gran corte!');
                }
            }

            if (themesRes.ok) {
                const themesData = await themesRes.json();
                const flowIdx = themesData.findIndex(t => t.nombre === 'Flow Estándar');
                if (flowIdx > 0) {
                    const [flow] = themesData.splice(flowIdx, 1);
                    themesData.unshift(flow);
                }
                setThemes(themesData);
            }

            if (usuariosRes.ok) {
                const adminsList = await usuariosRes.json();
                setAdmins(adminsList);
            }
        } catch (err) {
            console.error('Error cargando data:', err);
            toast.error('Error al cargar configuración');
        } finally {
            setLoading(false);
            setAdminsLoaded(true);
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
            formData.append('telefono_whatsapp', telefonoWhatsapp);
            formData.append('theme', theme);
            if (logoFile) {
                formData.append('logo', logoFile);
            }
            if (loyaltyFile) {
                formData.append('loyalty_card', loyaltyFile);
            }

            // Guardar SMTP Settings si existen campos base
            if (smtpUser && smtpPass) {
                try {
                    await fetch('/api/settings/smtp', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            Authorization: `Bearer ${localStorage.getItem('token')}` 
                        },
                        body: JSON.stringify({
                            smtp_host: smtpHost,
                            smtp_port: parseInt(smtpPort) || 587,
                            smtp_user: smtpUser,
                            smtp_pass: smtpPass,
                            smtp_from_name: smtpFromName,
                            smtp_secure: smtpSecure ? 1 : 0,
                            enviar_reportes: reportEnabled,
                            frecuencia_reporte: reportPeriod,
                            dia_reporte: diaReporte,
                            hora_reporte: horaReporte,
                            emails_reporte: emailsReporte,
                            fidelizacion_activa: fidelizacionActiva ? 1 : 0,
                            dias_inactividad: parseInt(diasInactividad) || 30,
                            mensaje_fidelizacion: mensajeFidelizacion
                        })
                    });
                } catch (err) {
                    console.error('Error no fatal guardando SMTP', err);
                }
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

    async function handleTestSMTP() {
        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
            toast.error('Llena todos los campos SMTP antes de probar la conexión.');
            return;
        }
        
        let loadingToast = toast.loading('Probando conexión con servidor SMTP...');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/settings/smtp/test', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({
                    test_email: smtpUser, // Intentará enviarle al mismo dueño que configuró
                    smtp_host: smtpHost,
                    smtp_port: parseInt(smtpPort) || 587,
                    smtp_user: smtpUser,
                    smtp_pass: smtpPass,
                    smtp_secure: smtpSecure ? 1 : 0,
                    smtp_from_name: smtpFromName
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success('¡Conexión Exitosa! Revisar el buzón de correo.', { id: loadingToast });
            } else {
                toast.error(data.error || 'Fallo de conexión SMTP', { id: loadingToast });
            }
        } catch (err) {
            toast.error('Error al intentar conectar al servidor', { id: loadingToast });
        }
    }

    async function handleSendReportNow() {
        if (!emailsReporte) {
            toast.error('Selecciona al menos un destinatario para enviar el reporte.');
            return;
        }

        setSendingTest(true);
        let loadingToast = toast.loading('Generando y enviando reporte...');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/settings/smtp/send-report-now', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                }
            });

            const data = await res.json();
            if (res.ok) {
                toast.success('¡Reporte enviado exitosamente!', { id: loadingToast });
            } else {
                toast.error(data.error || 'Fallo al enviar reporte', { id: loadingToast });
            }
        } catch (err) {
            toast.error('Error al solicitar envío del reporte', { id: loadingToast });
        } finally {
            setSendingTest(false);
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

    function handleLandingImagenChange(e) {
        const file = e.target.files[0];
        if (file) {
            setLandingImagenFile(file);
            setLandingImagenPreview(URL.createObjectURL(file));
        }
    }

    async function handleSaveLanding(e) {
        e.preventDefault();
        setSavingLanding(true);
        const loadingToast = toast.loading('Guardando configuración de la landing...');
        try {
            const formData = new FormData();
            formData.append('landing_titulo', landingTitulo);
            formData.append('landing_descripcion', landingDescripcion);
            if (landingImagenFile) {
                formData.append('landing_imagen', landingImagenFile);
            } else if (landingImagenPreview) {
                formData.append('landing_imagen_fondo', landingImagenPreview);
            }

            const token = localStorage.getItem('token');
            const res = await fetch('/api/configuracion/landing', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al guardar landing');

            toast.success('¡Landing Page actualizada!', { id: loadingToast });
            setLandingImagenFile(null);
        } catch (err) {
            console.error('Error:', err);
            toast.error(err.message || 'Error al guardar', { id: loadingToast });
        } finally {
            setSavingLanding(false);
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

                        {/* WhatsApp General */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>WhatsApp de la Barbería</label>
                            <div style={{ position: 'relative' }}>
                                <MessageSquare size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="tel"
                                    value={telefonoWhatsapp}
                                    onChange={(e) => setTelefonoWhatsapp(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}
                                    placeholder="Ej. 529511234567"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════ SELECTOR DE TEMAS ══════════════ */}
                <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--accent-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Palette size={22} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Personalización Visual</h2>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Elige el tema que mejor represente a tu barbería</p>
                            </div>
                        </div>
                        {saving && <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Guardando cambios...</span>}
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
                                    border: barberia?.tema_id === t.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                    background: barberia?.tema_id === t.id ? 'rgba(var(--accent-primary-rgb), 0.05)' : 'var(--bg-input)',
                                    boxShadow: barberia?.tema_id === t.id ? '0 4px 20px rgba(var(--accent-primary-rgb), 0.15)' : 'none',
                                    textAlign: 'left',
                                    cursor: saving ? 'wait' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {barberia?.tema_id === t.id && (
                                    <div style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(var(--accent-primary-rgb), 0.3)' }}>
                                        <CheckCircle size={18} />
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>{t.nombre}</h4>
                                    <Sparkles size={16} style={{ color: barberia?.tema_id === t.id ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
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
                                {themes.map(t => {
                                    const slug = t.nombre.toLowerCase().replace(/\s+/g, '_');
                                    const isSelected = theme === slug || (theme === 'default' && slug === 'flow_estándar');
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTheme(slug)}
                                            style={{
                                                position: 'relative',
                                                padding: '0.75rem',
                                                borderRadius: '16px',
                                                border: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                                background: isSelected ? 'rgba(var(--accent-primary-rgb), 0.05)' : 'var(--bg-input)',
                                                boxShadow: isSelected ? '0 4px 20px rgba(var(--accent-primary-rgb), 0.15)' : 'none',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {isSelected && (
                                                <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(var(--accent-primary-rgb), 0.3)' }}>
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
                </div>

                {/* ══════════════ COMUNICACIONES, NOTIFICACIONES Y SMTP ══════════════ */}
                <div style={{ ...cardStyle, gridColumn: '1 / -1', background: 'rgba(var(--bg-surface), 0.95)', border: '1px solid rgba(var(--accent-primary-rgb), 0.15)', borderLeft: '4px solid var(--accent-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--accent-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bell size={22} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Comunicaciones y Marketing Automatizado</h2>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Este correo se usará para enviarte tus reportes y para contactar automáticamente a clientes que tienen tiempo sin visitarte.</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'start', marginTop: '0.5rem' }}>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 2fr) 1fr', gap: '2rem' }}>
                            {/* SMTP Ajustes */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        <Server size={14} /> Servidor SMTP Host
                                    </label>
                                    <input
                                        type="text"
                                        value={smtpHost}
                                        onChange={(e) => setSmtpHost(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}
                                        placeholder="ej. smtp.gmail.com"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        Puerto SMTP
                                    </label>
                                    <input
                                        type="number"
                                        value={smtpPort}
                                        onChange={(e) => setSmtpPort(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}
                                        placeholder="465 o 587"
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    <Mail size={14} /> Correo de Envío (User)
                                </label>
                                <input
                                    type="email"
                                    value={smtpUser}
                                    onChange={(e) => setSmtpUser(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}
                                    placeholder="ej. tu.nombre@gmail.com"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    <Key size={14} /> Key de Aplicación (Contraseña Especial)
                                </label>
                                <input
                                    type="password"
                                    value={smtpPass}
                                    onChange={(e) => setSmtpPass(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', letterSpacing: '2px', fontFamily: 'monospace' }}
                                    placeholder="*************"
                                />
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>
                                    Si usas Gmail, no uses tu contraseña personal. Ve a "Seguridad" {'>'} "Contraseñas de aplicaciones" y crea una nueva.
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.25rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        Nombre Remitente (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={smtpFromName}
                                        onChange={(e) => setSmtpFromName(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}
                                        placeholder="Flow Barbería"
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
                                    <input
                                        type="checkbox"
                                        id="secureCheckbox"
                                        checked={smtpSecure}
                                        onChange={(e) => setSmtpSecure(e.target.checked)}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                    />
                                    <label htmlFor="secureCheckbox" style={{ fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer', userSelect: 'none' }}>
                                        Usar SSL/TLS (Seguro)
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.25rem' }}>
                                <button
                                    type="button"
                                    onClick={handleTestSMTP}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--accent-primary)',
                                        background: 'transparent',
                                        color: 'var(--accent-primary)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Server size={14} /> Probar Conexión SMTP
                                </button>
                            </div>
                        </div>

                        {/* Reportes Automatizados */}
                        <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px dashed var(--border-color)' }}>
                            <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
                                Reportes Automatizados
                            </h3>
                            
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    id="reportEnabled"
                                    checked={reportEnabled}
                                    onChange={(e) => setReportEnabled(e.target.checked)}
                                    style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <label htmlFor="reportEnabled" style={{ fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>
                                        Enviarme Reportes por Correo
                                    </label>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Resumen de cortes, inventario e ingresos</span>
                                </div>
                            </div>

                            <div style={{ opacity: reportEnabled ? 1 : 0.4, pointerEvents: reportEnabled ? 'auto' : 'none', transition: 'all 0.2s', marginTop: '0.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: reportPeriod === 'semanal' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                            <Clock size={14} /> Frecuencia
                                        </label>
                                        <select 
                                            value={reportPeriod} 
                                            onChange={(e) => setReportPeriod(e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
                                        >
                                            <option value="diario">Diaria</option>
                                            <option value="semanal">Semanal</option>
                                        </select>
                                    </div>
                                    
                                    {reportPeriod === 'semanal' && (
                                        <div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                Día
                                            </label>
                                            <select 
                                                value={diaReporte} 
                                                onChange={(e) => setDiaReporte(e.target.value)}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
                                            >
                                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => (
                                                    <option key={dia} value={dia}>{dia}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                            Hora
                                        </label>
                                        <input 
                                            type="time" 
                                            value={horaReporte}
                                            onChange={(e) => setHoraReporte(e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    <Users size={14} /> Enviar Reportes a (Administradores):
                                </label>
                                
                                {!adminsLoaded ? (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Cargando administradores...</p>
                                ) : admins.length === 0 ? (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay usuarios en la plataforma con el rol de Admin o Dueño para recibir reportes.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-surface)' }}>
                                        {admins.map(admin => {
                                            const isSelected = emailsReporte.includes(admin.correo);
                                            return (
                                                <label key={admin.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            let emails = emailsReporte.split(',').map(em => em.trim()).filter(em => em);
                                                            if (e.target.checked && !emails.includes(admin.correo)) {
                                                                emails.push(admin.correo);
                                                            } else if (!e.target.checked) {
                                                                emails = emails.filter(em => em !== admin.correo);
                                                            }
                                                            setEmailsReporte(emails.join(', '));
                                                        }}
                                                        style={{ accentColor: 'var(--accent-primary)' }}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{admin.nombre} <span style={{ color: 'var(--text-muted)' }}>({admin.correo})</span></span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                
                                <input
                                    type="text"
                                    value={emailsReporte}
                                    onChange={(e) => setEmailsReporte(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none', marginTop: '0.75rem', opacity: 0.6 }}
                                    placeholder="Correos seleccionados..."
                                />

                                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={handleSendReportNow}
                                        disabled={sendingTest}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.6rem 1.25rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--accent-primary)',
                                            background: 'var(--accent-primary)',
                                            color: '#fff',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: sendingTest ? 'wait' : 'pointer',
                                            transition: 'all 0.2s',
                                            opacity: sendingTest ? 0.7 : 1
                                        }}
                                    >
                                        {sendingTest ? <div className="spinner" style={{ width: '14px', height: '14px' }}></div> : <Server size={14} />} 
                                        {sendingTest ? 'Enviando...' : 'Enviar Ahora'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        </div>

                        {/* Fidelización Anti Abandono */}
                        <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }} />
                                    Fidelización de Clientes (Anti-Abandono)
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 600 }}>{fidelizacionActiva ? 'Activado' : 'Desactivado'}</label>
                                    <div 
                                        onClick={() => setFidelizacionActiva(!fidelizacionActiva)}
                                        style={{ 
                                            width: '40px', height: '22px', borderRadius: '11px', 
                                            background: fidelizacionActiva ? 'var(--accent-primary)' : 'var(--bg-surface)',
                                            border: `1px solid ${fidelizacionActiva ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                            position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                                        }}
                                    >
                                        <div style={{
                                            width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff',
                                            position: 'absolute', top: '2px', left: fidelizacionActiva ? '20px' : '2px',
                                            transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                        }}/>
                                    </div>
                                </div>
                            </div>

                            <div style={{ opacity: fidelizacionActiva ? 1 : 0.4, pointerEvents: fidelizacionActiva ? 'auto' : 'none', transition: 'all 0.2s', display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        <CalendarRange size={14} /> Días de Inactividad
                                    </label>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>
                                        Enviar correo si el cliente no nos ha visitado en esta cantidad de días.
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            min="1"
                                            value={diasInactividad}
                                            onChange={(e) => setDiasInactividad(e.target.value)}
                                            style={{ width: '80px', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}
                                        />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Días</span>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        Mensaje Personalizado
                                    </label>
                                    <textarea
                                        value={mensajeFidelizacion}
                                        onChange={(e) => setMensajeFidelizacion(e.target.value)}
                                        rows={4}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                                        placeholder="Ej: Hola {nombre_cliente}, te echamos de menos..."
                                    />
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                        Variables disponibles: <code style={{ background: 'var(--bg-surface)', padding: '2px 4px', borderRadius: '4px' }}>{`{nombre_cliente}`}</code>, <code style={{ background: 'var(--bg-surface)', padding: '2px 4px', borderRadius: '4px' }}>{`{nombre_barberia}`}</code>
                                    </p>
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
                                <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div> Guardando Ajustes Globales...</>
                            ) : (
                                <><Save size={20} /> Guardar Perfil y Temas</>
                            )}
                        </button>
                    </div>
                </div>

                {/* ══════════════ LANDING PAGE PERSONALIZABLE ══════════════ */}
                <div style={{ ...cardStyle, gridColumn: '1 / -1', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--accent-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={22} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Landing Page del Portal</h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lo primero que verán tus clientes al escanear el QR</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', marginTop: '0.5rem' }}>
                        {/* Formulario Landing */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Título de Bienvenida</label>
                                <input
                                    type="text"
                                    value={landingTitulo}
                                    onChange={(e) => setLandingTitulo(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700, outline: 'none' }}
                                    placeholder="Ej. Bienvenido a The Gangsta"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Descripción / Subtítulo</label>
                                <textarea
                                    value={landingDescripcion}
                                    onChange={(e) => setLandingDescripcion(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', resize: 'none', lineHeight: '1.5' }}
                                    placeholder="Ej. Agenda tu cita en segundos y obtén beneficios exclusivos..."
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Imagen de Fondo (Impacto Visual)</label>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--bg-input)', border: '2px dashed var(--border-color)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <Upload size={18} style={{ color: 'var(--accent-primary)' }} />
                                        <div style={{ textAlign: 'left' }}>
                                            <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Subir Nueva Imagen</span>
                                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Recomendado: 1080x1920 (Vertical)</span>
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleLandingImagenChange} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={handleSaveLanding}
                                    disabled={savingLanding}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.875rem 2rem',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: 'var(--accent-primary)',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: savingLanding ? 'wait' : 'pointer',
                                        opacity: savingLanding ? 0.7 : 1,
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 15px rgba(var(--accent-primary-rgb), 0.3)'
                                    }}
                                >
                                    {savingLanding ? (
                                        <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div> Guardando...</>
                                    ) : (
                                        <><Save size={18} /> Guardar Landing</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Preview en tiempo real (Celular) */}
                        <div style={{ position: 'relative' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Preview en Vivo</div>
                            <div style={{
                                width: '300px',
                                height: '540px',
                                margin: '0 auto',
                                borderRadius: '32px',
                                border: '8px solid #222',
                                overflow: 'hidden',
                                position: 'relative',
                                background: landingImagenPreview ? `url(${landingImagenPreview})` : '#1a1a1a',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1 }}></div>
                                <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', textAlign: 'center', color: '#fff' }}>
                                    {logoPreview && (
                                        <img src={logoPreview} alt="Logo" style={{ width: '50px', height: '50px', borderRadius: '50%', marginBottom: '0.5rem', border: '2px solid rgba(255,255,255,0.2)' }} />
                                    )}
                                    <div style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.8, marginBottom: '0.5rem', letterSpacing: '1px' }}>{nombre.toUpperCase() || 'MI BARBERÍA'}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '0.5rem' }}>{landingTitulo}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: 1.4, marginBottom: '1.5rem' }}>{landingDescripcion}</div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginBottom: '1.5rem', textAlign: 'left' }}>
                                        {[1, 2, 3].map(i => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6rem', opacity: 0.6 }}>
                                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem' }}>{i}</div>
                                                <span>Paso {i} del proceso</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ width: '100%', height: '40px', borderRadius: '10px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>Comenzar</div>
                                </div>
                            </div>
                        </div>
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
