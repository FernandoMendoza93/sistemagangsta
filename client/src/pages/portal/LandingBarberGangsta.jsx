import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, Menu, X, MapPin, Phone, Instagram, Facebook } from 'lucide-react';
import './LandingBarberGangsta.css';

export default function LandingBarberGangsta() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeHero, setActiveHero] = useState(0);
    const heroImages = [
        '/assets/gangsta/bg-1.jpeg',
        '/assets/gangsta/bg-2.jpeg',
        '/assets/gangsta/bg-3.jpeg'
    ];

    useEffect(() => {
        // Initialize Lenis for smooth scrolling
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            touchMultiplier: 0,
            infinite: false,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Hero image rotation
        const interval = setInterval(() => {
            setActiveHero((prev) => (prev + 1) % heroImages.length);
        }, 5000);

        return () => {
            lenis.destroy();
            clearInterval(interval);
        };
    }, []);

    const scrollTo = (id) => {
        setMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleLoginClick = () => {
        // Enlaza directamente con el inicio de sesión del sistema
        navigate('/portal/the-gangsta/acceso');
    };

    const fadeUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
    };

    return (
        <div className="landing-gangsta-root">
            {/* HEADER */}
            <header className="g-main-header">
                <div className="g-header-container">
                    <div className="g-header-logo">
                        <span className="g-logo-text">GANGSTA BARBER</span>
                    </div>
                    
                    <nav className="g-header-nav">
                        <button className="g-nav-cta-btn" onClick={handleLoginClick}>
                            RESERVAR
                        </button>
                        
                        <button className="g-nav-icon-btn g-menu-toggle" onClick={() => setMenuOpen(true)}>
                            <Menu size={22} />
                        </button>
                    </nav>
                </div>
            </header>

            {/* MOBILE MENU */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div 
                        className="g-menu-overlay"
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="g-menu-panel">
                            <button className="g-close-menu-btn" onClick={() => setMenuOpen(false)}>
                                <X size={24} />
                            </button>
                            <div className="g-menu-links">
                                <button onClick={() => scrollTo('hero')}>Inicio</button>
                                <button onClick={() => scrollTo('servicios')}>Servicios</button>
                                <button onClick={() => scrollTo('estudio')}>El Estudio</button>
                                <button onClick={() => scrollTo('precios')}>Precios</button>
                                <button onClick={() => scrollTo('contacto')}>Contacto</button>
                            </div>
                            <div className="g-menu-footer">
                                <span className="g-logo-text-small">GANGSTA BARBER</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main>
                {/* HERO SECTION */}
                <section className="g-hero-section" id="hero">
                    <div className="g-hero-bg-container">
                        <AnimatePresence>
                            <motion.img
                                key={activeHero}
                                src={heroImages[activeHero]}
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="g-carousel-img"
                                alt="Gangsta Barber Background"
                            />
                        </AnimatePresence>
                        <div className="g-hero-overlay-dark"></div>
                    </div>
                    
                    <div className="g-hero-content">
                        <motion.h2 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
                            className="g-hero-subtitle"
                        >
                            GANGSTA BARBER SHOP
                        </motion.h2>
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }}
                            className="g-hero-title"
                        >
                            ESTILO CON <br/>PROPÓSITO.
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }}
                            className="g-hero-text"
                        >
                            Cortes premium. Equilibrio perfecto. Comienza tu transformación.
                        </motion.p>
                        
                        <motion.button 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1, duration: 0.8 }}
                            className="g-btn-primary"
                            onClick={handleLoginClick}
                        >
                            COMENZAR <span className="g-arrow">→</span>
                        </motion.button>
                    </div>
                    <div className="g-scroll-indicator">
                        <div className="g-dot"></div>
                        <span>EXPLORAR SERVICIOS</span>
                    </div>
                </section>

                {/* SERVICIOS SECTION */}
                <section className="g-section-dark" id="servicios">
                    <div className="g-container">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="g-section-header">
                            <span className="g-section-label">EL ARTE DEL GROOMING</span>
                            <h2 className="g-section-title">NUESTROS SERVICIOS</h2>
                            <p className="g-section-desc">Diseñados meticulosamente para esculpir tu estilo, definir tus líneas y fomentar la confianza.</p>
                        </motion.div>

                        <div className="g-cards-grid">
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="g-service-card">
                                <div className="g-card-img-container">
                                    <div className="g-badge">POPULAR</div>
                                    <img src={heroImages[1]} alt="Corte Clásico" />
                                </div>
                                <div className="g-card-content">
                                    <h3>CORTE CLÁSICO</h3>
                                    <span className="g-card-subtitle">RELAX FOR A MOMENT</span>
                                    <p>Tijera, máquina y navaja. Un corte tradicional o moderno, esculpido a la perfección según tu tipo de rostro y cabello.</p>
                                    <button className="g-card-btn" onClick={handleLoginClick}>AGENDAR CITA</button>
                                </div>
                            </motion.div>
                            
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="g-service-card">
                                <div className="g-card-img-container">
                                    <img src={heroImages[2]} alt="Arreglo de Barba" />
                                </div>
                                <div className="g-card-content">
                                    <h3>BARBA PREMIUM</h3>
                                    <span className="g-card-subtitle">FUERZA Y RESISTENCIA</span>
                                    <p>Combina el control de toallas calientes con el perfilado perfecto a navaja libre para esculpir tu rostro.</p>
                                    <button className="g-card-btn" onClick={handleLoginClick}>AGENDAR CITA</button>
                                </div>
                            </motion.div>
                            
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="g-service-card">
                                <div className="g-card-img-container">
                                    <img src={heroImages[0]} alt="Full Service" />
                                </div>
                                <div className="g-card-content">
                                    <h3>FULL SERVICE</h3>
                                    <span className="g-card-subtitle">CONÉCTATE CONTIGO</span>
                                    <p>El ritual completo: Corte y Barba, mascarilla negra, lavado relajante y bebida de cortesía.</p>
                                    <button className="g-card-btn" onClick={handleLoginClick}>AGENDAR CITA</button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* EL ESTUDIO */}
                <section className="g-section-deep-dark" id="estudio">
                    <div className="g-container">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="g-section-header">
                            <span className="g-section-label">LA BARBERÍA</span>
                            <h2 className="g-section-title">EL SANTUARIO DE ESTILO</h2>
                            <p className="g-section-desc">Diseñamos una experiencia premium que cuida hasta el mínimo detalle durante tu estancia en Gangsta Barber.</p>
                        </motion.div>

                        <div className="g-features-grid">
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="g-feature-card">
                                <div className="g-feature-icon">
                                    <User size={24} color="var(--g-gold)" />
                                </div>
                                <h3>ATENCIÓN VIP</h3>
                                <p>Un servicio personalizado. Entendemos tu estilo y te asesoramos para lograr tu mejor versión.</p>
                            </motion.div>

                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="g-feature-card">
                                <div className="g-feature-icon">
                                    <Calendar size={24} color="var(--g-gold)" />
                                </div>
                                <h3>BARRA DE BEBIDAS</h3>
                                <p>Disfruta de una bebida refrescante de cortesía pensada especialmente para hidratarte y relajarte durante tu servicio.</p>
                            </motion.div>
                            
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="g-feature-card">
                                <div className="g-feature-icon">
                                    <MapPin size={24} color="var(--g-gold)" />
                                </div>
                                <h3>PRIVACIDAD & CONFORT</h3>
                                <p>Instalaciones climatizadas de diseño minimalista pensadas para tu total relajación.</p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* PRECIOS SECTION */}
                <section className="g-section-dark" id="precios">
                    <div className="g-container">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="g-section-header">
                            <span className="g-section-label">SERVICIOS</span>
                            <h2 className="g-section-title">CONOCE NUESTROS PRECIOS</h2>
                            <p className="g-section-desc">Elige el servicio que mejor resuene con tu estilo.</p>
                        </motion.div>
                        
                        <div className="g-pricing-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            {[
                                { name: 'Barba', price: '200.00', time: '40 min' },
                                { name: 'Corte', price: '200.00', time: '40 min' },
                                { name: 'Corte + Barba', price: '300.00', time: '80 min' },
                                { name: 'Corte Escolar', price: '150.00', time: '30 min' },
                                { name: 'Diseño de Cejas', price: '50.00', time: '20 min' },
                                { name: 'Presidential Service', price: '500.00', time: '110 min', popular: true },
                                { name: 'Semipermanente', price: '400.00', time: '30 min' },
                                { name: 'Tinte cubre canas', price: '120.00', time: '60 min' }
                            ].map((service, index) => (
                                <motion.div key={index} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className={`g-pricing-card ${service.popular ? 'g-pricing-gold' : 'g-pricing-dark-green'}`} style={{ padding: '30px 20px' }}>
                                    {service.popular && <div className="g-pricing-badge">VIP</div>}
                                    <h3 style={{ fontSize: '1.2rem', marginTop: service.popular ? '20px' : '0' }}>{service.name}</h3>
                                    <div className="g-price-wrap" style={{ marginBottom: '15px' }}>
                                        <span className="g-currency">$</span>
                                        <span className="g-amount" style={{ fontSize: '2.5rem' }}>{service.price}</span>
                                    </div>
                                    <p style={{ opacity: 0.8, fontSize: '0.85rem', marginBottom: '20px' }}>⏱ {service.time}</p>
                                    <button className={service.popular ? "g-btn-dark-full" : "g-btn-gold-full"} onClick={handleLoginClick}>AGENDAR</button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FOOTER / CONTACTO */}
                <footer className="g-footer" id="contacto">
                    <div className="g-container g-footer-grid">
                        <div className="g-footer-info">
                            <span className="g-section-label">CONTACTO</span>
                            <h2 className="g-section-title">CONECTA CON NOSOTROS</h2>
                            <p className="g-section-desc">Estamos ubicados en el corazón de la ciudad. Escríbenos para agendar o aclarar tus dudas.</p>
                            
                            <div className="g-contact-items">
                                <div className="g-contact-item">
                                    <MapPin size={20} color="var(--g-gold)" />
                                    <div>
                                        <strong>Ubicación</strong>
                                        <p>Orquídeas 122, Antiguo Aeropuerto, 71245 Santa Lucía del Camino, Oax.</p>
                                    </div>
                                </div>
                                <div className="g-contact-item">
                                    <Phone size={20} color="var(--g-gold)" />
                                    <div>
                                        <strong>Línea Directa / WhatsApp</strong>
                                        <p>+52 951 129 9866</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="g-social-links">
                                <a href="https://www.instagram.com/gangstabarberstudiomx" target="_blank" rel="noreferrer"><Instagram size={20} /></a>
                            </div>
                        </div>
                        <div className="g-footer-map">
                            <div className="g-map-placeholder">
                                <iframe 
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3814.2885973748286!2d-96.697418!3d17.058319!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85c721c000000001%3A0x1234567890abcdef!2sOrqu%C3%ADdeas%20122%2C%20Antiguo%20Aeropuerto%2C%2071245%20Santa%20Luc%C3%ADa%20del%20Camino%2C%20Oax.!5e0!3m2!1ses!2smx!4v1700000000000!5m2!1ses!2smx" 
                                    className="g-map-iframe"
                                    allowFullScreen="" 
                                    loading="lazy" 
                                    referrerPolicy="no-referrer-when-downgrade">
                                </iframe>
                                <div className="g-map-overlay-content">
                                    <div className="g-animated-pin-container">
                                        <motion.div
                                            animate={{ y: [0, -20, 0] }}
                                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                            className="g-pin-icon"
                                        >
                                            <MapPin size={56} color="var(--g-gold)" />
                                        </motion.div>
                                        <motion.div 
                                            className="g-pin-shadow"
                                            animate={{ scale: [1, 0.5, 1], opacity: [0.6, 0.2, 0.6] }}
                                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                        ></motion.div>
                                    </div>
                                    <h3 style={{ letterSpacing: '4px', marginTop: '10px' }}>GANGSTA BARBER</h3>
                                    <button className="g-btn-outline-gold" onClick={() => window.open('https://maps.app.goo.gl/nyLwxSooa6qoXdQs8')}>ABRIR EN MAPAS</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="g-footer-bottom">
                        <p>© 2026 GANGSTA BARBER. Todos los derechos reservados.</p>
                        <div className="g-footer-legal">
                            <a href="#">Aviso de Privacidad</a>
                            <a href="#">Términos y Condiciones</a>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
