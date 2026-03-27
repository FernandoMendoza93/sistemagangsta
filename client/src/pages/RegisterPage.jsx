import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Scissors, Upload, MapPin, Phone, Mail, Lock, Store, Camera, CheckCircle, ArrowRight, MessageCircle, CreditCard, Image } from 'lucide-react';
import './RegisterPage.css';

const API_BASE = '/api';

export default function RegisterPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef(null);

    // Pre-fill from landing page state
    const preData = location.state || {};

    const [formData, setFormData] = useState({
        nombre: preData.nombre || '',
        email: preData.email || '',
        password: preData.password || '',
        telefono_whatsapp: '',
        direccion: '',
        plan: 'mensual'
    });

    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    function handleLogoChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('La imagen no debe superar 2MB');
            return;
        }

        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target.result);
        reader.readAsDataURL(file);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const form = new FormData();
            form.append('nombre', formData.nombre);
            form.append('email', formData.email);
            form.append('password', formData.password);
            form.append('telefono_whatsapp', formData.telefono_whatsapp);
            form.append('direccion', formData.direccion);
            form.append('plan', formData.plan);
            if (logoFile) {
                form.append('logo', logoFile);
            }

            const res = await fetch(`${API_BASE}/auth/register-barberia`, {
                method: 'POST',
                body: form
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const precio = formData.plan === 'anual' ? '$5,000 MXN' : '$600 MXN';

    if (success) {
        return (
            <div className="register-page">
                <nav className="reg-page-nav">
                    <div className="reg-page-nav-brand" onClick={() => navigate('/')}>
                        <Scissors size={24} strokeWidth={1.5} />
                        <span>Flow</span>
                    </div>
                </nav>
                <div className="reg-page-content">
                    <div className="reg-page-card">
                        <div className="reg-success-page">
                            <CheckCircle size={56} color="#10B981" />
                            <h2>Bienvenido a Flow</h2>
                            <p>Tu barberia <strong>{success.barberia.nombre}</strong> ha sido registrada.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
                                Accede con: <strong>{success.credentials.email}</strong>
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9CA3AF)', marginTop: '1rem' }}>
                                Tu cuenta sera activada una vez confirmemos tu pago.
                                Te notificaremos por WhatsApp.
                            </p>
                            <button className="btn-go-login" onClick={() => navigate('/login')}>
                                Ir al Panel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="register-page">
            {/* Nav */}
            <nav className="reg-page-nav">
                <div className="reg-page-nav-brand" onClick={() => navigate('/')}>
                    <Scissors size={24} strokeWidth={1.5} />
                    <span>Flow</span>
                </div>
            </nav>

            <div className="reg-page-content">
                <div className="reg-page-card">
                    <h1>Completa tu Registro</h1>
                    <p className="reg-page-subtitle">Falta poco para tener tu sistema listo</p>

                    {/* Steps */}
                    <div className="reg-steps">
                        <span className="reg-step done"><CheckCircle size={14} /> Datos basicos</span>
                        <span className="reg-step-separator"></span>
                        <span className="reg-step active"><ArrowRight size={14} /> Informacion completa</span>
                    </div>

                    {error && <div className="reg-error">{error}</div>}

                    <form className="reg-page-form" onSubmit={handleSubmit} autoComplete="off">

                        {/* Logo Upload */}
                        <p className="reg-section-title"><Image size={18} color="#FF5F40" /> Logo de tu Barberia</p>
                        <div className="reg-field">
                            <div className="logo-upload-area">
                                <div className={`logo-preview ${logoPreview ? 'has-image' : ''}`}>
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo preview" />
                                    ) : (
                                        <Camera size={24} color="#9CA3AF" />
                                    )}
                                </div>
                                <div className="logo-upload-info">
                                    <button type="button" className="btn-upload" onClick={() => fileInputRef.current?.click()}>
                                        <Upload size={14} /> {logoPreview ? 'Cambiar imagen' : 'Subir logo'}
                                    </button>
                                    <p>PNG o JPG, max 2MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={handleLogoChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Business Info */}
                        <p className="reg-section-title"><Store size={18} color="#FF5F40" /> Datos del Negocio</p>

                        <div className="reg-field">
                            <label className="reg-label">Nombre de tu Barberia</label>
                            <input
                                className={`reg-field-input ${formData.nombre ? 'has-value' : ''}`}
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Ej. The Gangsta Barber Shop"
                                required
                            />
                        </div>

                        <div className="reg-field">
                            <label className="reg-label">Telefono / WhatsApp</label>
                            <input
                                className={`reg-field-input ${formData.telefono_whatsapp ? 'has-value' : ''}`}
                                type="tel"
                                inputMode="numeric"
                                maxLength={12}
                                value={formData.telefono_whatsapp}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                                    setFormData({ ...formData, telefono_whatsapp: val });
                                }}
                                placeholder="Ej. 529511955349"
                                required
                            />
                        </div>

                        <div className="reg-field">
                            <label className="reg-label">Ubicacion / Direccion</label>
                            <input
                                className={`reg-field-input ${formData.direccion ? 'has-value' : ''}`}
                                value={formData.direccion}
                                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                placeholder="Calle, colonia, ciudad"
                                required
                            />
                        </div>

                        {/* Account */}
                        <p className="reg-section-title"><Lock size={18} color="#FF5F40" /> Acceso al Panel</p>

                        <div className="reg-field">
                            <label className="reg-label">Correo electronico</label>
                            <input
                                className={`reg-field-input ${formData.email ? 'has-value' : ''}`}
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="tu@email.com"
                                required
                            />
                        </div>

                        <div className="reg-field">
                            <label className="reg-label">Contrasena</label>
                            <input
                                className={`reg-field-input ${formData.password ? 'has-value' : ''}`}
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Minimo 6 caracteres"
                                required
                                minLength={6}
                            />
                        </div>

                        {/* Plan */}
                        <p className="reg-section-title"><CreditCard size={18} color="#FF5F40" /> Elige tu Plan</p>

                        <div className="reg-plan-grid">
                            <div
                                className={`reg-plan-option ${formData.plan === 'mensual' ? 'selected' : ''}`}
                                onClick={() => setFormData({ ...formData, plan: 'mensual' })}
                            >
                                <p className="plan-name">Mensual</p>
                                <p className="plan-price">$600</p>
                                <p className="plan-period">MXN / mes</p>
                            </div>
                            <div
                                className={`reg-plan-option ${formData.plan === 'anual' ? 'selected' : ''}`}
                                onClick={() => setFormData({ ...formData, plan: 'anual' })}
                            >
                                <span className="plan-popular-tag">Ahorra $2,200</span>
                                <p className="plan-name">Anual</p>
                                <p className="plan-price">$5,000</p>
                                <p className="plan-period">MXN / año</p>
                            </div>
                        </div>

                        {/* Payment */}
                        <div className="payment-box">
                            <h3><CreditCard size={18} color="#FF5F40" /> Datos de Pago</h3>

                            <div className="payment-detail">
                                <span className="payment-detail-label">Plan seleccionado</span>
                                <span className="payment-detail-value">{formData.plan === 'anual' ? 'Anual' : 'Mensual'}</span>
                            </div>
                            <div className="payment-detail">
                                <span className="payment-detail-label">Total a pagar</span>
                                <span className="payment-detail-value" style={{ color: '#FF5F40' }}>{precio}</span>
                            </div>
                            <div className="payment-detail">
                                <span className="payment-detail-label">Banco</span>
                                <span className="payment-detail-value">BBVA</span>
                            </div>
                            <div className="payment-detail">
                                <span className="payment-detail-label">CLABE</span>
                                <span className="payment-detail-value">0123 4567 8901 234567</span>
                            </div>
                            <div className="payment-detail">
                                <span className="payment-detail-label">Titular</span>
                                <span className="payment-detail-value">Fernando Mendoza</span>
                            </div>

                            <div className="payment-note">
                                Realiza tu transferencia y manda tu comprobante por WhatsApp.
                                Activaremos tu cuenta en menos de 24 horas.
                            </div>

                            <a
                                href={`https://wa.me/529511955349?text=${encodeURIComponent(`Hola Fernando! Acabo de registrar mi barberia "${formData.nombre}" en Flow. Adjunto mi comprobante de pago por el plan ${formData.plan} (${precio}). Mi correo: ${formData.email}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-whatsapp-pay"
                            >
                                <MessageCircle size={18} /> Enviar Comprobante por WhatsApp
                            </a>
                        </div>

                        {/* Submit */}
                        <button type="submit" className="btn-activate" disabled={loading}>
                            {loading ? 'Registrando...' : 'Activar mi Cuenta'}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
