import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, BarChart3, Users, Calendar, Package, Shield, CheckCircle, Zap, ArrowRight } from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });

    function handleContinue(e) {
        e.preventDefault();
        // Navigate to full registration page with pre-filled data
        navigate('/registrar', { state: formData });
    }

    return (
        <div className="landing-page">
            {/* Nav */}
            <nav className="landing-nav">
                <div className="landing-nav-brand">
                    <Scissors size={24} strokeWidth={1.5} />
                    <span>Flow</span>
                </div>
                <button className="nav-login-btn" onClick={() => navigate('/login')}>
                    Iniciar Sesion
                </button>
            </nav>

            {/* Hero */}
            <section className="landing-hero">
                <div className="hero-badge">
                    <Zap size={14} /> SaaS para Barberias
                </div>
                <h1>El <span className="hero-highlight">motor</span> de tu barberia</h1>
                <p>
                    Gestiona citas, inventario, ventas y lealtad de clientes desde una sola plataforma.
                    Todo lo que necesitas para hacer crecer tu negocio.
                </p>
                <div className="hero-cta-group">
                    <button className="btn-cta-primary" onClick={() => document.getElementById('registro').scrollIntoView({ behavior: 'smooth' })}>
                        Comenzar Gratis <ArrowRight size={18} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                    </button>
                    <button className="btn-cta-secondary" onClick={() => navigate('/login')}>
                        Ver Demo
                    </button>
                </div>
            </section>

            {/* Features */}
            <section className="landing-features">
                <h2 className="features-title">Todo en una sola plataforma</h2>
                <p className="features-subtitle">Las herramientas que tu barberia necesita para operar como un profesional</p>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon"><Calendar size={22} color="#FF5F40" /></div>
                        <h3>Agenda Inteligente</h3>
                        <p>Sistema de citas tipo Tetris que evita traslapes y maximiza tu tiempo.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><BarChart3 size={22} color="#FF5F40" /></div>
                        <h3>Punto de Venta</h3>
                        <p>Registra ventas, cortes de caja y comisiones de tus barberos.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><Package size={22} color="#FF5F40" /></div>
                        <h3>Inventario</h3>
                        <p>Control de stock con alertas de minimo y movimientos trazables.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><Users size={22} color="#FF5F40" /></div>
                        <h3>Lealtad Digital</h3>
                        <p>Tarjeta QR de membresia, sellos digitales y recompensas para tus clientes.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><Shield size={22} color="#FF5F40" /></div>
                        <h3>Roles y Permisos</h3>
                        <p>Admin, Encargado y Barbero con accesos personalizados.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><BarChart3 size={22} color="#FF5F40" /></div>
                        <h3>Reportes</h3>
                        <p>Metricas en tiempo real de ventas, servicios y rendimiento del negocio.</p>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="landing-pricing">
                <h2 className="features-title">Planes simples, sin sorpresas</h2>
                <p className="features-subtitle">Escoge el plan que se ajuste a tu negocio</p>

                <div className="pricing-cards">
                    <div className="pricing-card">
                        <p className="pricing-plan-name">Mensual</p>
                        <p className="pricing-price">$299 <small>MXN/mes</small></p>
                        <ul className="pricing-features">
                            <li><CheckCircle size={16} color="#34D399" /> Citas ilimitadas</li>
                            <li><CheckCircle size={16} color="#34D399" /> Punto de venta</li>
                            <li><CheckCircle size={16} color="#34D399" /> Portal de clientes</li>
                            <li><CheckCircle size={16} color="#34D399" /> Reportes basicos</li>
                        </ul>
                    </div>
                    <div className="pricing-card popular">
                        <p className="pricing-plan-name">Anual</p>
                        <p className="pricing-price">$2,999 <small>MXN/ano</small></p>
                        <ul className="pricing-features">
                            <li><CheckCircle size={16} color="#34D399" /> Todo del plan mensual</li>
                            <li><CheckCircle size={16} color="#34D399" /> 2 meses gratis</li>
                            <li><CheckCircle size={16} color="#34D399" /> Soporte prioritario</li>
                            <li><CheckCircle size={16} color="#34D399" /> Personalizacion de marca</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Mini Registration — Step 1 */}
            <section className="landing-register" id="registro">
                <div className="register-card">
                    <h2>Registra tu Barberia</h2>
                    <p className="reg-subtitle">Comienza a gestionar tu negocio en minutos</p>

                    <form className="reg-form" onSubmit={handleContinue}>
                        <input
                            className="reg-input"
                            placeholder="Nombre de tu Barberia"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            required
                        />
                        <input
                            className="reg-input"
                            type="email"
                            placeholder="Tu correo electronico"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                        <input
                            className="reg-input"
                            type="password"
                            placeholder="Contrasena para tu panel"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                        />

                        <button type="submit" className="btn-register">
                            Crear mi Barberia <ArrowRight size={18} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                        </button>
                    </form>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                Flow Barber Management System &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
}
