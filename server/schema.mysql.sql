-- =============================================
-- FLOW — BARBER MANAGEMENT SYSTEM (SaaS)
-- Schema MySQL — Multi-Tenant
-- Migrado desde SQLite schema.sql
-- =============================================

CREATE DATABASE barberia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE barberia;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =============================================
-- TABLA DE TEMAS (Paletas de colores)
-- =============================================

CREATE TABLE IF NOT EXISTS temas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    bg_main VARCHAR(20) NOT NULL,
    bg_surface VARCHAR(20) NOT NULL,
    accent_primary VARCHAR(20) NOT NULL,
    accent_secondary VARCHAR(20),
    text_main VARCHAR(20) NOT NULL,
    text_muted VARCHAR(20),
    clase_glass VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: Temas predefinidos
INSERT INTO temas (nombre, bg_main, bg_surface, accent_primary, accent_secondary, text_main, text_muted, clase_glass) VALUES
('Obsidian Night', '#0a0a0f', '#12121a', '#6366F1', '#818CF8', '#f1f1f4', '#71717a', 'glass-dark'),
('Midnight Blue',  '#0b0f1a', '#111827', '#3B82F6', '#60A5FA', '#f0f4ff', '#6b7280', 'glass-dark'),
('Emerald Dark',   '#0a0f0d', '#0f1a16', '#10B981', '#34D399', '#ecfdf5', '#6b7280', 'glass-dark'),
('Rose Gold',      '#1a0a10', '#1f1018', '#F43F5E', '#FB7185', '#fff1f2', '#71717a', 'glass-dark'),
('Amber Flame',    '#1a1008', '#1f1610', '#F59E0B', '#FBBF24', '#fffbeb', '#71717a', 'glass-dark'),
('Purple Reign',   '#10081a', '#170f22', '#A855F7', '#C084FC', '#faf5ff', '#71717a', 'glass-dark'),
('Cyan Steel',     '#081014', '#0e171f', '#06B6D4', '#22D3EE', '#ecfeff', '#6b7280', 'glass-dark'),
('Classic Light',  '#f8f9fa', '#ffffff', '#6366F1', '#818CF8', '#111827', '#6b7280', 'glass-light'),
('Warm Light',     '#faf8f5', '#ffffff', '#EA580C', '#F97316', '#1c1917', '#78716c', 'glass-light'),
('Menta Limpia',   '#F0F9F6', '#FFFFFF', '#10B981', '#34D399', '#064E3B', '#6EE7B7', 'glass-light'),
('Oro Industrial',  '#1A1A1A', '#2D2D2D', '#D4AF37', '#F1C40F', '#FFFFFF', '#A0A0A0', 'glass-dark'),
('Noche Urbana',    '#0F172A', '#1E293B', '#6366F1', '#818CF8', '#F8FAFC', '#94A3B8', 'glass-dark'),
('Cuero Natural',   '#FAFAF9', '#FFFFFF', '#9A3412', '#C2410C', '#1C1917', '#A8A29E', 'glass-light'),
('Classic Barber',  '#FAFAF9', '#FFFFFF', '#DC2626', '#EF4444', '#1C1917', '#78716C', 'glass-light');

-- =============================================
-- TABLA MAESTRA: BARBERÍAS (Tenants)
-- =============================================

CREATE TABLE IF NOT EXISTS barberias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    logo_url VARCHAR(500),
    color_acento VARCHAR(20) DEFAULT '#FF6B4A',
    telefono_whatsapp VARCHAR(20),
    email_contacto VARCHAR(255),
    direccion VARCHAR(500),
    plan ENUM('mensual', 'anual', 'trial') DEFAULT 'mensual',
    precio_plan DECIMAL(10,2) DEFAULT 299,
    fecha_suscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATETIME,
    activo TINYINT(1) DEFAULT 1,
    theme TEXT DEFAULT NULL,
    loyalty_card_image_url VARCHAR(500),
    tema_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tema_id) REFERENCES temas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLAS DE SEGURIDAD (RBAC)
-- =============================================

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    barberia_id INT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (id_rol) REFERENCES roles(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLAS DE PERSONAL Y COMISIONES
-- =============================================

CREATE TABLE IF NOT EXISTS barberos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    porcentaje_comision DECIMAL(5,2) DEFAULT 0.50,
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    turno VARCHAR(50) DEFAULT 'Completo',
    barberia_id INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comisiones_pendientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barbero INT NOT NULL,
    id_venta_detalle INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    pagado TINYINT(1) DEFAULT 0,
    barberia_id INT,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comisiones_pagadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barbero INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario_admin INT NOT NULL,
    notas TEXT,
    barberia_id INT,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (id_usuario_admin) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLAS DE SERVICIOS
-- =============================================

CREATE TABLE IF NOT EXISTS servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_servicio VARCHAR(255) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    duracion_aprox INT DEFAULT 30,
    activo TINYINT(1) DEFAULT 1,
    barberia_id INT,
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLAS DE CLIENTES
-- =============================================

CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    password_hash VARCHAR(255),
    puntos_lealtad INT DEFAULT 0,
    ultima_visita DATETIME,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    activo TINYINT(1) DEFAULT 1,
    barberia_id INT,
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLAS DE CITAS
-- =============================================

CREATE TABLE IF NOT EXISTS citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_servicio INT,
    id_barbero INT,
    fecha VARCHAR(10) NOT NULL,
    hora VARCHAR(5) NOT NULL,
    estado ENUM('Pendiente', 'Confirmada', 'Cancelada', 'Completada') DEFAULT 'Pendiente',
    notas TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    barberia_id INT,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id),
    FOREIGN KEY (id_servicio) REFERENCES servicios(id),
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLAS DE INVENTARIO (antes de ventas por dependencia de FK)
-- =============================================

CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    barberia_id INT,
    UNIQUE KEY uq_categoria_barberia (nombre, barberia_id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    stock_actual INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    precio_costo DECIMAL(10,2) DEFAULT 0,
    precio_venta DECIMAL(10,2) NOT NULL,
    id_categoria INT,
    activo TINYINT(1) DEFAULT 1,
    barberia_id INT,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLAS DE VENTAS
-- =============================================

CREATE TABLE IF NOT EXISTS ventas_cabecera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_cliente INT,
    id_barbero INT,
    total_venta DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia') DEFAULT 'Efectivo',
    estado_corte_caja TINYINT(1) DEFAULT 0,
    estado ENUM('pendiente', 'completada', 'cancelada') DEFAULT 'completada',
    notas TEXT,
    barberia_id INT,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ventas_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_venta_cabecera INT NOT NULL,
    id_servicio INT,
    id_producto INT,
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    barberia_id INT,
    FOREIGN KEY (id_venta_cabecera) REFERENCES ventas_cabecera(id),
    FOREIGN KEY (id_servicio) REFERENCES servicios(id),
    FOREIGN KEY (id_producto) REFERENCES productos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    tipo ENUM('Entrada', 'Salida', 'Ajuste') NOT NULL,
    cantidad INT NOT NULL,
    motivo TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT,
    barberia_id INT,
    FOREIGN KEY (id_producto) REFERENCES productos(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA DE AUDITORÍA - CORTES DE CAJA
-- =============================================

CREATE TABLE IF NOT EXISTS cortes_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,
    hora_apertura VARCHAR(8),
    fecha_cierre DATETIME,
    hora_cierre VARCHAR(8),
    monto_inicial DECIMAL(10,2) DEFAULT 0,
    ingresos_calculados DECIMAL(10,2) DEFAULT 0,
    monto_real_fisico DECIMAL(10,2),
    diferencia DECIMAL(10,2),
    id_encargado INT NOT NULL,
    notas TEXT,
    modo_cierre VARCHAR(50) DEFAULT 'transparente',
    total_ventas DECIMAL(10,2) DEFAULT 0,
    total_ganancias DECIMAL(10,2) DEFAULT 0,
    abonos_efectivo DECIMAL(10,2) DEFAULT 0,
    devoluciones_efectivo DECIMAL(10,2) DEFAULT 0,
    entradas_efectivo_total DECIMAL(10,2) DEFAULT 0,
    barberia_id INT,
    FOREIGN KEY (id_encargado) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gastos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monto DECIMAL(10,2) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    barberia_id INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entradas_efectivo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monto DECIMAL(10,2) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    id_corte INT,
    barberia_id INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_corte) REFERENCES cortes_caja(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA DE LEALTAD
-- =============================================

CREATE TABLE IF NOT EXISTS visitas_lealtad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    barberia_id INT NOT NULL,
    id_barbero INT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id),
    FOREIGN KEY (id_barbero) REFERENCES barberos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA DE HORARIOS POR BARBERO
-- =============================================

CREATE TABLE IF NOT EXISTS horarios_barberos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barbero INT NOT NULL,
    dia_semana TINYINT NOT NULL CHECK(dia_semana BETWEEN 0 AND 6),
    hora_inicio VARCHAR(5) NOT NULL,
    hora_fin VARCHAR(5) NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    barberia_id INT NOT NULL,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id),
    UNIQUE KEY uq_horario_barbero (id_barbero, dia_semana, barberia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- ÍNDICES PARA RENDIMIENTO MULTI-TENANT
-- =============================================

CREATE INDEX idx_usuarios_barberia ON usuarios(barberia_id);
CREATE INDEX idx_clientes_barberia ON clientes(barberia_id);
CREATE INDEX idx_citas_barberia ON citas(barberia_id);
CREATE INDEX idx_ventas_barberia ON ventas_cabecera(barberia_id);
CREATE INDEX idx_servicios_barberia ON servicios(barberia_id);
CREATE INDEX idx_productos_barberia ON productos(barberia_id);
CREATE INDEX idx_horarios_barbero ON horarios_barberos(id_barbero, dia_semana, barberia_id);

-- =============================================
-- DATOS INICIALES (Roles + SuperAdmin + Tenant #1)
-- =============================================

-- Roles del sistema
INSERT IGNORE INTO roles (id, nombre_rol) VALUES (1, 'Admin');
INSERT IGNORE INTO roles (id, nombre_rol) VALUES (2, 'Encargado');
INSERT IGNORE INTO roles (id, nombre_rol) VALUES (3, 'Barbero');
INSERT IGNORE INTO roles (id, nombre_rol) VALUES (4, 'SuperAdmin');

-- The Gangsta Barber Shop (Tenant #1 — fundador)
INSERT IGNORE INTO barberias (id, nombre, slug, telefono_whatsapp, email_contacto, plan, precio_plan, fecha_vencimiento, activo)
VALUES (1, 'The Gangsta Barber Shop', 'the-gangsta', '529511955349', 'admin@barberia.com', 'anual', 0, DATE_ADD(NOW(), INTERVAL 1 YEAR), 1);

-- SuperAdmin (NO pertenece a ninguna barberia)
INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, barberia_id, activo)
VALUES (99, 'Fernando Mendoza', 'superadmin@flow.com', '$2a$10$LSqZn7RarDawowdFon0BKOv2klo6Y13HCwU8Wf8INmVFFwSDdaSJi', 4, NULL, 1);

-- Staff de The Gangsta (barberia_id = 1)
INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, barberia_id, activo)
VALUES (1, 'Administrador', 'admin@barberia.com', '$2a$10$LSqZn7RarDawowdFon0BKOv2klo6Y13HCwU8Wf8INmVFFwSDdaSJi', 1, 1, 1);

INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, barberia_id, activo)
VALUES (2, 'Fernando Mendoza', 'fernando.mendoza@gmail.com', '$2a$10$1S38OljW9Bof4rKFKCIEjuT6P2Ynu6XwA2pOD9C6F4rGmLqCZzFXO', 3, 1, 1);

INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, barberia_id, activo)
VALUES (3, 'Eliza Acevedo', 'elizabarber@gmail.com', '$2a$10$nsQc1sIeypGNMkwbv0pzveb2yUYuTYGGbl0.dSsxkt34j8Vu1zX6i', 3, 1, 1);

INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, barberia_id, activo)
VALUES (4, 'Alejandro Lopez', 'alejandro.lopez@gmail.com', '$2a$10$2iSma5hK.glYPKseoI5bCea6UV31oJCi945zVggXNqEMzmAHe/TvG', 1, 1, 1);

-- Barberos de The Gangsta
INSERT IGNORE INTO barberos (id, id_usuario, porcentaje_comision, estado, turno, barberia_id)
VALUES (1, 2, 0.50, 'Activo', 'Completo', 1);

INSERT IGNORE INTO barberos (id, id_usuario, porcentaje_comision, estado, turno, barberia_id)
VALUES (2, 3, 0.50, 'Activo', 'Completo', 1);

-- Categorías de productos (barberia_id = 1)
INSERT IGNORE INTO categorias (id, nombre, descripcion, barberia_id) VALUES (1, 'Venta', 'Productos para venta al cliente', 1);
INSERT IGNORE INTO categorias (id, nombre, descripcion, barberia_id) VALUES (2, 'Insumo Limpieza', 'Productos de limpieza y desinfección', 1);
INSERT IGNORE INTO categorias (id, nombre, descripcion, barberia_id) VALUES (3, 'Herramientas', 'Instrumentos de trabajo', 1);

-- Servicios de The Gangsta
INSERT IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo, barberia_id) VALUES (1, 'Corte', 200.00, 30, 1, 1);
INSERT IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo, barberia_id) VALUES (2, 'Barba', 200.00, 60, 1, 1);
INSERT IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo, barberia_id) VALUES (3, 'Corte + Barba', 300.00, 90, 1, 1);
INSERT IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo, barberia_id) VALUES (4, 'Tinte', 120.00, 60, 1, 1);
INSERT IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo, barberia_id) VALUES (5, 'Diseño de Cejas', 50.00, 20, 1, 1);
INSERT IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo, barberia_id) VALUES (6, 'Corte Escolar', 150.00, 30, 1, 1);

-- Productos de The Gangsta
INSERT IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo, barberia_id)
VALUES (1, 'Cera para Cabello', 'Cera de fijación fuerte', 12, 5, 40.00, 80.00, 1, 1, 1);

INSERT IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo, barberia_id)
VALUES (2, 'Minoxidil', 'Tratamiento para crecimiento de barba', 8, 3, 80.00, 150.00, 1, 1, 1);

INSERT IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo, barberia_id)
VALUES (3, 'Aceite para Barba', 'Aceite hidratante', 1, 5, 50.00, 100.00, 1, 1, 1);

INSERT IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo, barberia_id)
VALUES (4, 'Alcohol Gel', 'Desinfectante de manos', 10, 3, 25.00, 0, 2, 1, 1);

INSERT IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo, barberia_id)
VALUES (5, 'Toallas Desechables', 'Paquete de 100 toallas', 5, 2, 60.00, 0, 2, 1, 1);

INSERT IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo, barberia_id)
VALUES (6, 'Desinfectante Barbacide', 'Para herramientas', 8, 2, 120.00, 0, 2, 1, 1);

-- Horarios de The Gangsta
-- dia_semana: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
INSERT IGNORE INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id) VALUES (1, 5, '14:00', '21:30', 1, 1);
INSERT IGNORE INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id) VALUES (1, 6, '10:00', '21:30', 1, 1);
INSERT IGNORE INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id) VALUES (1, 0, '10:30', '19:30', 1, 1);
INSERT IGNORE INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id) VALUES (2, 5, '14:00', '21:30', 1, 1);
INSERT IGNORE INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id) VALUES (2, 6, '10:00', '21:30', 1, 1);
INSERT IGNORE INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id) VALUES (2, 0, '10:30', '19:30', 1, 1);

-- =============================================
-- INFORMACIÓN DE ACCESO
-- =============================================
-- SuperAdmin:  superadmin@flow.com / admin123
-- Admin TG:    admin@barberia.com / admin123
-- Staff TG:    alejandro.lopez@gmail.com / admin123
